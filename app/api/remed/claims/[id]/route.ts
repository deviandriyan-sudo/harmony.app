import { NextRequest, NextResponse } from 'next/server'
import { REMED_BUCKET } from '@/lib/remed'
import { requireRemedApi, remedApiError } from '@/lib/server/remed-api-auth'
import type { RemedClaim } from '@/types/remed'
import { getRemedPrintSignatures } from '@/lib/server/remed-signatures'

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireRemedApi(request)
    const { id } = await context.params

    const { data, error } = await ctx.admin
      .from('remed_claims')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    if (!data) throw Object.assign(new Error('Klaim tidak ditemukan.'), { status: 404 })

    if (ctx.access.role === 'employee' && data.employee_id !== ctx.access.employee_id) {
      throw Object.assign(new Error('Anda tidak memiliki akses ke klaim ini.'), { status: 403 })
    }

    // Printing needs only the claim, employee identity and claim type. Avoid
    // coupling the form to entitlement/attachment lookups used by claim lists:
    // an unrelated reporting-table error must not make a valid form disappear.
    const [employeeResult, typeResult] = await Promise.all([
      ctx.admin.from('employees')
        .select('id,employee_number,full_name,department,position,email')
        .eq('id', data.employee_id).maybeSingle(),
      ctx.admin.from('remed_claim_types')
        .select('id,code,name,description,is_active')
        .eq('id', data.claim_type_id).maybeSingle(),
    ])
    const claim: RemedClaim = {
      ...(data as RemedClaim),
      employee: employeeResult.error ? null : employeeResult.data,
      claim_type: typeResult.error ? null : typeResult.data,
    }
    const dataWarning = employeeResult.error || typeResult.error
      ? 'Sebagian profil karyawan atau jenis klaim belum dapat dimuat. Form tetap dapat dicetak; periksa data sebelum digunakan.'
      : null
    // A missing/ambiguous signature configuration must not hide a valid claim
    // from the authorized user. Print the document without signatures, but
    // report their unavailability; never fabricate an approval signature.
    let signatures: Awaited<ReturnType<typeof getRemedPrintSignatures>> | null = null
    let signatureWarning: string | null = null
    try {
      signatures = await getRemedPrintSignatures(ctx.admin, {
        employeeId: claim.employee_id,
        hrSignatoryEmployeeId: claim.hr_signatory_employee_id || null,
        financeSignatoryEmployeeId: claim.finance_signatory_employee_id || null,
      })
    } catch (signatureError) {
      console.error('Re-Med claim signatures could not be loaded',
        signatureError instanceof Error ? signatureError.name : 'lookup_error')
      signatureWarning = 'Data tanda tangan belum dapat dimuat. Periksa konfigurasi di HR Re-Med.'
    }
    return NextResponse.json({ claim, signatures, signature_warning: signatureWarning, data_warning: dataWarning },
      { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireRemedApi(request, ['hr', 'finance'])
    const { id } = await context.params
    const body = await request.json().catch(() => ({}))
    const reason = String(body?.reason || '').trim()

    if (!reason) {
      throw Object.assign(new Error('Alasan penghapusan wajib diisi.'), { status: 400 })
    }

    const { data, error } = await ctx.admin.rpc('remed_delete_claim_v2', {
      p_claim_id: id,
      p_actor_auth_user_id: ctx.authUserId,
      p_actor_email: ctx.access.email,
      p_reason: reason,
    })
    if (error) throw Object.assign(new Error(error.message), { status: 400 })

    const storagePaths = Array.isArray(data?.storage_paths)
      ? data.storage_paths.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
      : []

    let storageWarning: string | null = null
    if (storagePaths.length) {
      const { error: storageError } = await ctx.admin.storage.from(REMED_BUCKET).remove(storagePaths)
      if (storageError) storageWarning = 'Data klaim terhapus, tetapi sebagian file Storage perlu dibersihkan manual.'
    }

    return NextResponse.json({ success: true, result: data, warning: storageWarning })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import {
  REMED_SIGNATURE_ALLOWED_MIME_TYPES,
  REMED_SIGNATURE_BUCKET,
  REMED_SIGNATURE_MAX_FILE_SIZE,
  safeFileName,
} from '@/lib/remed'
import { requireRemedApi, remedApiError } from '@/lib/server/remed-api-auth'
import { getRemedSignatureDisplay, getRemedSignatureManagement } from '@/lib/server/remed-signatures'

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireRemedApi(request)
    const scope = request.nextUrl.searchParams.get('scope') || 'me'

    if (scope === 'management') {
      if (ctx.access.role !== 'hr') {
        throw Object.assign(new Error('Hanya HR yang dapat membuka manajemen tanda tangan.'), { status: 403 })
      }
      const employees = await getRemedSignatureManagement(ctx.admin)
      return NextResponse.json({ employees })
    }

    if (!ctx.access.employee_id) return NextResponse.json({ signature: null })

    const signature = await getRemedSignatureDisplay(ctx.admin, ctx.access.employee_id, 'employee')
    return NextResponse.json({ signature })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}

export async function POST(request: NextRequest) {
  let uploadedPath = ''
  let cleanupAdmin: any = null

  try {
    const ctx = await requireRemedApi(request)
    cleanupAdmin = ctx.admin
    const form = await request.formData()
    const file = form.get('file')
    const requestedEmployeeId = String(form.get('employee_id') || '').trim()
    const targetEmployeeId = requestedEmployeeId || ctx.access.employee_id || ''

    if (!targetEmployeeId) {
      throw Object.assign(new Error('Employee untuk tanda tangan tidak ditemukan.'), { status: 400 })
    }

    if (ctx.access.role !== 'hr' && targetEmployeeId !== ctx.access.employee_id) {
      throw Object.assign(new Error('Anda hanya dapat mengganti tanda tangan sendiri.'), { status: 403 })
    }

    if (!(file instanceof File)) {
      throw Object.assign(new Error('File tanda tangan wajib dipilih.'), { status: 400 })
    }
    if (!REMED_SIGNATURE_ALLOWED_MIME_TYPES.has(file.type)) {
      throw Object.assign(new Error('Format tanda tangan harus PNG, JPG/JPEG, atau WEBP.'), { status: 400 })
    }
    if (file.size <= 0 || file.size > REMED_SIGNATURE_MAX_FILE_SIZE) {
      throw Object.assign(new Error('Ukuran file tanda tangan maksimal 2 MB.'), { status: 400 })
    }

    const { data: employee, error: employeeError } = await ctx.admin
      .from('employees')
      .select('id,full_name,employee_number')
      .eq('id', targetEmployeeId)
      .maybeSingle()
    if (employeeError) throw employeeError
    if (!employee) throw Object.assign(new Error('Master employee HARMONY tidak ditemukan.'), { status: 404 })

    const { data: existing, error: existingError } = await ctx.admin
      .from('remed_signature_profiles')
      .select('signature_path')
      .eq('employee_id', targetEmployeeId)
      .maybeSingle()
    if (existingError) throw existingError

    const bytes = Buffer.from(await file.arrayBuffer())
    uploadedPath = `${targetEmployeeId}/${Date.now()}-${safeFileName(file.name)}`

    const { error: uploadError } = await ctx.admin.storage
      .from(REMED_SIGNATURE_BUCKET)
      .upload(uploadedPath, bytes, { contentType: file.type, upsert: false })
    if (uploadError) throw uploadError

    const { error: upsertError } = await ctx.admin
      .from('remed_signature_profiles')
      .upsert(
        {
          employee_id: targetEmployeeId,
          signature_path: uploadedPath,
          signature_origin: 'upload',
          signature_file_name: file.name,
          signature_mime_type: file.type,
          updated_by_auth_user_id: ctx.authUserId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'employee_id' },
      )
    if (upsertError) throw upsertError

    const previousPath = String(existing?.signature_path || '')
    if (previousPath && previousPath !== uploadedPath) {
      await ctx.admin.storage.from(REMED_SIGNATURE_BUCKET).remove([previousPath])
    }

    await ctx.admin.rpc('remed_write_audit_v1', {
      p_actor_auth_user_id: ctx.authUserId,
      p_actor_email: ctx.access.email,
      p_actor_role: ctx.access.role,
      p_action: 'signature_updated',
      p_entity_type: 'remed_signature_profile',
      p_entity_id: targetEmployeeId,
      p_metadata: { employee_number: employee.employee_number, employee_name: employee.full_name },
    })

    const signature = await getRemedSignatureDisplay(ctx.admin, targetEmployeeId, 'employee')
    return NextResponse.json({ success: true, signature })
  } catch (error) {
    if (uploadedPath && cleanupAdmin) {
      try {
        await cleanupAdmin.storage.from(REMED_SIGNATURE_BUCKET).remove([uploadedPath])
      } catch {
        // Best-effort rollback only.
      }
    }
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await requireRemedApi(request, ['hr'])
    const body = await request.json()
    const role = String(body?.role || '').trim().toLowerCase()
    const employeeId = String(body?.employee_id || '').trim()

    if (!['hr', 'finance'].includes(role)) {
      throw Object.assign(new Error('Role penandatangan harus HR atau Finance.'), { status: 400 })
    }
    if (!employeeId) {
      throw Object.assign(new Error('Pilih employee penandatangan.'), { status: 400 })
    }

    const { data, error } = await ctx.admin.rpc('remed_set_signatory_v1', {
      p_role: role,
      p_employee_id: employeeId,
      p_actor_auth_user_id: ctx.authUserId,
    })
    if (error) throw Object.assign(new Error(error.message), { status: 400 })

    await ctx.admin.rpc('remed_write_audit_v1', {
      p_actor_auth_user_id: ctx.authUserId,
      p_actor_email: ctx.access.email,
      p_actor_role: ctx.access.role,
      p_action: 'signatory_changed',
      p_entity_type: 'remed_signature_profile',
      p_entity_id: employeeId,
      p_metadata: { role },
    })

    return NextResponse.json({ success: true, result: data })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = await requireRemedApi(request)
    const body = await request.json().catch(() => ({}))
    const requestedEmployeeId = String(body?.employee_id || '').trim()
    const targetEmployeeId = requestedEmployeeId || ctx.access.employee_id || ''

    if (!targetEmployeeId) {
      throw Object.assign(new Error('Employee untuk tanda tangan tidak ditemukan.'), { status: 400 })
    }
    if (ctx.access.role !== 'hr' && targetEmployeeId !== ctx.access.employee_id) {
      throw Object.assign(new Error('Anda hanya dapat menghapus tanda tangan sendiri.'), { status: 403 })
    }

    const { data: existing, error: existingError } = await ctx.admin
      .from('remed_signature_profiles')
      .select('signature_path')
      .eq('employee_id', targetEmployeeId)
      .maybeSingle()
    if (existingError) throw existingError

    const { error: updateError } = await ctx.admin
      .from('remed_signature_profiles')
      .upsert(
        {
          employee_id: targetEmployeeId,
          signature_path: null,
          signature_origin: null,
          signature_file_name: null,
          signature_mime_type: null,
          updated_by_auth_user_id: ctx.authUserId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'employee_id' },
      )
    if (updateError) throw updateError

    if (existing?.signature_path) {
      await ctx.admin.storage.from(REMED_SIGNATURE_BUCKET).remove([existing.signature_path])
    }

    const signature = await getRemedSignatureDisplay(ctx.admin, targetEmployeeId, 'employee')
    return NextResponse.json({ success: true, signature })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}

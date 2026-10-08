import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

import {
  harmonyApiError,
  requireHarmonyApi,
} from '@/lib/server/user-api-auth'

export const runtime = 'nodejs'

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || ''
}

function createUserScopedClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw Object.assign(new Error('Konfigurasi Supabase user API belum lengkap.'), { status: 500 })
  }

  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}


function canonicalDate(value: unknown) {
  const raw = String(value || '').trim().slice(0, 10)
  if (!raw) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const slash = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (slash) return `${slash[3]}-${slash[2]}-${slash[1]}`
  const dash = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (dash) return `${dash[3]}-${dash[2]}-${dash[1]}`
  return ''
}

function normalizeStatus(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

function isTerminalInactiveStatus(value: unknown) {
  const status = normalizeStatus(value)
  return status.startsWith('cancel')
    || status.startsWith('reject')
    || status.startsWith('dibatal')
    || status.startsWith('ditolak')
}

function isTerminalInactiveClaim(row: Record<string, any>) {
  return isTerminalInactiveStatus(row.status)
    || isTerminalInactiveStatus(row.supervisor_status)
    || isTerminalInactiveStatus(row.hr_status)
}

async function findSameDateClaims(ctx: Awaited<ReturnType<typeof requireHarmonyApi>>, claimDate: string) {
  const results: Record<string, any>[] = []
  const seen = new Set<string>()

  const collect = (rows: Record<string, any>[] | null) => {
    for (const row of rows || []) {
      const id = String(row.id || '')
      if (!id || seen.has(id)) continue
      seen.add(id)
      results.push(row)
    }
  }

  const byEmployee = await ctx.admin
    .from('phl_records')
    .select('id,employee_id,machine_pin,phl_date,status,supervisor_status,hr_status,source,created_at')
    .eq('employee_id', ctx.employee!.id)
    .eq('source', 'employee_phl_claim')
    .order('created_at', { ascending: false })
    .limit(500)
  if (byEmployee.error) throw byEmployee.error
  collect((byEmployee.data || []).filter((row: any) => canonicalDate(row.phl_date) === claimDate))

  // Legacy claim indexes use machine/date. Check machine_pin too so the API preflight
  // mirrors the database uniqueness rule even when an old row lost employee_id linkage
  // or phl_date is still stored as legacy TEXT formatting.
  if (ctx.employee?.machine_pin) {
    const byMachine = await ctx.admin
      .from('phl_records')
      .select('id,employee_id,machine_pin,phl_date,status,supervisor_status,hr_status,source,created_at')
      .eq('machine_pin', ctx.employee.machine_pin)
      .eq('source', 'employee_phl_claim')
      .order('created_at', { ascending: false })
      .limit(500)
    if (byMachine.error) throw byMachine.error
    collect((byMachine.data || []).filter((row: any) => canonicalDate(row.phl_date) === claimDate))
  }

  return results
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireHarmonyApi(request)
    if (!ctx.employee?.id) {
      return NextResponse.json({ message: 'Akun belum terhubung ke Employee Master.' }, { status: 400 })
    }

    const body = await request.json().catch(() => null)
    const token = getBearerToken(request)
    const scoped = createUserScopedClient(token)

    const claimDate = String(body?.claim_date || '').trim()
    const days = Number(body?.days || 0)
    const reason = String(body?.reason || '').trim()
    const jobPending = String(body?.job_pending || '').trim()
    const handoverName = String(body?.handover_to_full_name || '').trim()

    if (!/^\d{4}-\d{2}-\d{2}$/.test(claimDate)) {
      return NextResponse.json({ message: 'Tanggal klaim PHL tidak valid.' }, { status: 400 })
    }
    if (days !== 1) {
      return NextResponse.json({ message: 'Klaim PHL hanya dapat diajukan 1 hari per pengajuan.' }, { status: 400 })
    }
    if (!reason) {
      return NextResponse.json({ message: 'Alasan klaim PHL wajib diisi.' }, { status: 400 })
    }
    if (!jobPending) {
      return NextResponse.json({ message: 'Job pending wajib diisi.' }, { status: 400 })
    }
    if (!handoverName) {
      return NextResponse.json({ message: 'Penerima job pending wajib dipilih.' }, { status: 400 })
    }

    const sameDateClaims = await findSameDateClaims(ctx, claimDate)
    const activeClaim = sameDateClaims.find((row) => !isTerminalInactiveClaim(row))
    if (activeClaim) {
      return NextResponse.json(
        {
          message: 'Sudah ada klaim PHL aktif pada tanggal tersebut. Selesaikan atau batalkan klaim aktif sebelum membuat pengajuan baru.',
          code: 'PHL_ACTIVE_CLAIM_EXISTS',
          claim_record_id: activeClaim.id,
        },
        { status: 409 },
      )
    }

    const { data: balanceData, error: balanceError } = await scoped.rpc('get_my_phl_balance_summary')
    if (balanceError) {
      return NextResponse.json(
        { message: `Saldo PHL gagal diverifikasi: ${balanceError.message}` },
        { status: 400 },
      )
    }

    if ((balanceData as any)?.success === false) {
      return NextResponse.json(
        { message: String((balanceData as any)?.message || 'Saldo PHL tidak dapat diverifikasi.') },
        { status: 409 },
      )
    }

    const available = Number((balanceData as any)?.total_available_days ?? (balanceData as any)?.available_days ?? 0)
    if (!Number.isFinite(available) || available < 1) {
      return NextResponse.json(
        { message: 'Saldo PHL aktif tidak mencukupi untuk klaim 1 hari.' },
        { status: 409 },
      )
    }

    const { data, error } = await scoped.rpc('harmony_employee_submit_phl_claim_v1', {
      p_request_key: String(body?.request_key || crypto.randomUUID()),
      p_claim_date: claimDate,
      p_days: days,
      p_reason: reason,
      p_proof_file_url: body?.proof_file_url || null,
      p_proof_file_name: body?.proof_file_name || null,
      p_proof_file_size: body?.proof_file_size || null,
      p_proof_file_type: body?.proof_file_type || null,
      p_job_pending_summary: jobPending,
      p_job_pending_detail: String(body?.job_pending_detail || jobPending).trim(),
      p_handover_to_employee_id: body?.handover_to_employee_id || null,
      p_handover_to_employee_number: body?.handover_to_employee_number || null,
      p_handover_to_full_name: handoverName,
      p_handover_to_department: body?.handover_to_department || null,
      p_handover_to_position: body?.handover_to_position || null,
      p_handover_note: String(body?.handover_note || '').trim() || null,
      p_emergency_contact: body?.emergency_contact || null,
    })

    if (error) {
      const databaseText = [
        String((error as any)?.message || ''),
        String((error as any)?.details || ''),
        String((error as any)?.hint || ''),
      ].join(' ')
      const legacyUniqueIndex = error.code === '23505'
        && databaseText.includes('idx_phl_claim_unique_machine_date_active')

      return NextResponse.json(
        {
          message: legacyUniqueIndex
            ? 'Klaim PHL lama pada tanggal ini sudah dibatalkan/ditolak, tetapi index database lama masih mengunci tanggal tersebut. Jalankan SQL_ONLY migration pada release HARMONY terbaru lalu submit ulang.'
            : (error.message || 'Klaim PHL gagal diproses.'),
          code: legacyUniqueIndex ? 'PHL_LEGACY_UNIQUE_INDEX' : (error.code || null),
        },
        { status: legacyUniqueIndex ? 409 : 400 },
      )
    }

    const result = (data || {}) as { success?: boolean; claim_record_id?: string; message?: string }
    if (result.success === false) {
      return NextResponse.json(
        { message: result.message || 'Klaim PHL belum berhasil disimpan.', result },
        { status: 400 },
      )
    }

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const issue = harmonyApiError(error, 'Klaim PHL gagal diproses.')
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = await requireHarmonyApi(request)
    if (!ctx.employee?.id) {
      return NextResponse.json({ message: 'Akun belum terhubung ke Employee Master.' }, { status: 400 })
    }

    const body = await request.json().catch(() => null)
    const claimRecordId = String(body?.claim_record_id || '').trim()
    const note = String(body?.note || '').trim()

    if (!claimRecordId) {
      return NextResponse.json({ message: 'ID klaim PHL wajib diisi.' }, { status: 400 })
    }
    if (note.length < 3) {
      return NextResponse.json({ message: 'Alasan pembatalan minimal 3 karakter.' }, { status: 400 })
    }

    const token = getBearerToken(request)
    const scoped = createUserScopedClient(token)
    const { data, error } = await scoped.rpc('harmony_employee_cancel_phl_claim_v1', {
      p_claim_record_id: claimRecordId,
      p_note: note,
    })

    if (error) {
      return NextResponse.json({ message: error.message || 'Klaim PHL gagal dibatalkan.' }, { status: 400 })
    }

    const result = (data || {}) as { success?: boolean; message?: string }
    if (result.success === false) {
      return NextResponse.json({ message: result.message || 'Klaim PHL gagal dibatalkan.' }, { status: 400 })
    }

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const issue = harmonyApiError(error, 'Klaim PHL gagal dibatalkan.')
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}

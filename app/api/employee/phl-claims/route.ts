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
      return NextResponse.json(
        { message: error.message || 'Klaim PHL gagal diproses.', code: error.code || null },
        { status: 400 },
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

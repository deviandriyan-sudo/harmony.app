import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Koreksi saldo cuti gagal.'
}

async function hrClient(request: NextRequest) {
  const token = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1]
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!token || !url || !key) throw Object.assign(new Error('Session HR tidak tersedia.'), {status: 401})
  const db = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: {persistSession: false, autoRefreshToken: false},
  })
  const auth = await db.auth.getUser(token)
  if (auth.error || !auth.data.user) throw Object.assign(new Error('Session HR tidak valid.'), {status: 401})
  const permission = await db.rpc('harmony_leave_is_active_hr_admin')
  if (permission.error) {
    const unavailable = ['PGRST202', '42883'].includes(String(permission.error.code || ''))
    throw Object.assign(new Error(unavailable
      ? 'Fungsi permission lifecycle cuti belum tersedia di Supabase. Jalankan SQL diagnostik Stage 5 (read-only), jangan ubah saldo secara langsung.'
      : `Pemeriksaan permission HR untuk koreksi cuti gagal: ${permission.error.message}`), {status: unavailable ? 503 : 403})
  }
  if (permission.data !== true) throw Object.assign(new Error('Akses HR/Admin lifecycle cuti ditolak oleh database. Pastikan app_users aktif, role HR, dan fungsi harmony_leave_is_active_hr_admin sesuai.'), {status: 403})
  return db
}

export async function GET(request: NextRequest) {
  try {
    const db = await hrClient(request)
    const employeeId = request.nextUrl.searchParams.get('employee_id') || ''
    if (!/^[0-9a-f-]{36}$/i.test(employeeId)) return NextResponse.json({error:'Employee ID tidak valid.'},{status:400})
    const result = await db.from('harmony_annual_leave_correction_audit')
      .select('id,employee_id,previous_effective_balance,corrected_effective_balance,reason,created_at')
      .eq('employee_id',employeeId).order('created_at',{ascending:false}).limit(10)
    if (result.error) {
      const missing = ['42P01', 'PGRST205'].includes(String(result.error.code || ''))
      throw Object.assign(new Error(missing
        ? 'Tabel audit koreksi cuti tidak tersedia. Periksa SQL_ONLY/02 dan jalankan diagnostik Stage 5 read-only.'
        : result.error.message), {status: missing ? 503 : 400})
    }
    // Best-effort, read-only reconciliation. Never make audit history depend on
    // legacy schema access; a failed diagnostic must not change balances.
    let diagnostic: {
      available: boolean
      legacy_cycle_balance: number | null
      active_legacy_cycles: number
      pending_hr_reserved_days: number
      pending_hr_request_count: number
      note?: string
    } = {
      available: false,
      legacy_cycle_balance: null,
      active_legacy_cycles: 0,
      pending_hr_reserved_days: 0,
      pending_hr_request_count: 0,
    }
    try {
      const [cycles, requests, ledger] = await Promise.all([
        db.from('employee_annual_leave_balances')
          .select('id,status,cycle_start,cycle_end,remaining_days')
          .eq('employee_id',employeeId),
        db.from('leave_requests')
          .select('id,request_type,status,supervisor_status,hr_status,total_days')
          .eq('employee_id',employeeId).eq('request_type','annual_leave'),
        db.from('employee_annual_leave_transactions')
          .select('leave_request_id,transaction_type,transaction_days')
          .eq('employee_id',employeeId),
      ])
      if (cycles.error || requests.error || ledger.error) {
        throw new Error('Data saldo legacy atau reservasi belum bisa dibaca.')
      }

      const todayParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit',
      }).formatToParts(new Date())
      const part = (kind: string) => todayParts.find(item => item.type === kind)?.value || ''
      const today = `${part('year')}-${part('month')}-${part('day')}`
      const activeCycles = (cycles.data || []).filter(item =>
        item.status === 'active' && item.cycle_start <= today && item.cycle_end >= today
      ).sort((a,b) => String(a.cycle_start).localeCompare(String(b.cycle_start)))
      const pending = (requests.data || []).filter(item =>
        String(item.supervisor_status || '').toLowerCase() === 'approved' &&
        !['approved','rejected','cancelled','canceled'].includes(String(item.hr_status || '').toLowerCase()) &&
        !['rejected','cancelled','canceled'].includes(String(item.status || '').toLowerCase())
      )
      const ledgerByRequest = new Map<string,number>()
      for (const item of ledger.data || []) {
        if (!item.leave_request_id) continue
        const direction = item.transaction_type === 'use' ? 1 : item.transaction_type === 'rollback' ? -1 : 0
        ledgerByRequest.set(item.leave_request_id,
          (ledgerByRequest.get(item.leave_request_id) || 0) + direction * Number(item.transaction_days || 0))
      }
      diagnostic = {
        available: true,
        legacy_cycle_balance: activeCycles.length > 0 ? Number(activeCycles[0].remaining_days || 0) : null,
        active_legacy_cycles: activeCycles.length,
        pending_hr_reserved_days: pending.reduce((total,item) =>
          total + Math.max(0, ledgerByRequest.get(item.id) || 0),0),
        pending_hr_request_count: pending.length,
        ...(activeCycles.length !== 1 ? {
          note: 'Jumlah siklus legacy aktif pada tanggal pemeriksaan bukan satu; perlu review HR.'
        } : {}),
      }
    } catch {
      diagnostic.note = 'Diagnostik legacy tidak tersedia; audit koreksi tetap bisa dibaca.'
    }
    return NextResponse.json({success:true,history:result.data||[],diagnostic},{headers:{'Cache-Control':'no-store'}})
  } catch (error) {
    const status = (error as {status?:number}).status || 400
    return NextResponse.json({error:message(error)},{status})
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await hrClient(request)
    const body = await request.json().catch(() => null)
    const employeeId = String(body?.employee_id || '')
    const target = Number(body?.target_days)
    const reason = String(body?.reason || '').trim()
    if (!/^[0-9a-f-]{36}$/i.test(employeeId) || !Number.isInteger(target) || target < 0 || target > 365 || reason.length < 12 || reason.length > 1000)
      return NextResponse.json({error:'Karyawan, target 0–365 hari, dan alasan minimal 12 karakter wajib diisi.'},{status:400})
    const result = await db.rpc('harmony_hr_correct_annual_leave_balance_v1', {
      p_employee_id:employeeId,p_target_days:target,p_reason:reason,
    })
    if (result.error) {
      const unavailable = ['PGRST202', '42883'].includes(String(result.error.code || ''))
      const lifecycleMismatch = [
        'Database tidak menghubungkan saldo legacy',
        'Verifikasi saldo lifecycle gagal',
        'Adjustment lifecycle berubah sejak ringkasan dibaca',
      ].some((marker) => String(result.error.message).includes(marker))
      const explanation = unavailable
        ? 'RPC koreksi saldo cuti belum terpasang di Supabase. Periksa migrasi SQL_ONLY/02 dan jalankan diagnostik read-only Stage 5.'
        : lifecycleMismatch
          ? 'RPC koreksi saldo lama masih aktif di Supabase. Instal SQL_ONLY/07_STAGE6_LIFECYCLE_ANNUAL_CORRECTION_SAFE.sql setelah backup database; perubahan saat ini dibatalkan otomatis.'
          : result.error.message
      throw Object.assign(new Error(explanation), {status: unavailable ? 503 : lifecycleMismatch ? 409 : 400})
    }
    return NextResponse.json({success:true,result:result.data},{headers:{'Cache-Control':'no-store'}})
  } catch (error) {
    const status = (error as {status?:number}).status || 400
    return NextResponse.json({error:message(error)},{status})
  }
}

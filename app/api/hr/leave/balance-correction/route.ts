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
  if (permission.error || permission.data !== true) throw Object.assign(new Error('Akses HR/Admin aktif diperlukan.'), {status: 403})
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
    if (result.error) throw result.error
    return NextResponse.json({success:true,history:result.data||[]},{headers:{'Cache-Control':'no-store'}})
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
    if (result.error) throw result.error
    return NextResponse.json({success:true,result:result.data},{headers:{'Cache-Control':'no-store'}})
  } catch (error) {
    const status = (error as {status?:number}).status || 400
    return NextResponse.json({error:message(error)},{status})
  }
}

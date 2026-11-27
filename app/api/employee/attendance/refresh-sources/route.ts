import { NextRequest, NextResponse } from 'next/server'
import { requireHarmonyApi, harmonyApiError } from '@/lib/server/user-api-auth'
import { isValidPeriod, syncEmployeeAttendanceSources } from '@/lib/server/attendance-source-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** The employee_id is derived solely from the verified access token. */
export async function POST(request: NextRequest) {
  try {
    const { admin, employee } = await requireHarmonyApi(request)
    if (!employee?.id || employee.is_active === false) {
      return NextResponse.json({ success:false, error:'Akun belum memiliki karyawan aktif.' }, {status:403})
    }
    const body = await request.json().catch(()=>null)
    const start = String(body?.start || '')
    const end = String(body?.end || '')
    if (!isValidPeriod(start,end)) {
      return NextResponse.json({success:false,error:'Rentang periode maksimum 45 hari dan harus berupa tanggal yang sah.'},{status:400})
    }
    if (process.env.HARMONY_ATTENDANCE_SOURCE_WRITE_ENABLED !== 'true') {
      return NextResponse.json({success:true,disabled:true},{headers:{'Cache-Control':'private, no-store'}})
    }
    const summary = await syncEmployeeAttendanceSources(admin,employee.id,start,end)
    return NextResponse.json({success:true,summary},{headers:{'Cache-Control':'private, no-store'}})
  } catch(error) {
    const response=harmonyApiError(error,'Sinkronisasi sumber absensi belum berhasil.')
    return NextResponse.json({success:false,error:response.message},{status:response.status})
  }
}

import { NextRequest } from 'next/server'
import { requireHarmonyApi } from '@/lib/server/user-api-auth'
const HR_ROLES = new Set(['hr','admin','administrator','super_admin','human_resources'])
export async function requireProfileAccess(request: NextRequest, targetId?: string | null) {
  const context = await requireHarmonyApi(request)
  const isHR = HR_ROLES.has(String(context.appUser.role || '').toLowerCase())
  const id = targetId || context.employee?.id
  if (!id) throw Object.assign(new Error('Akun belum memiliki profil karyawan.'), { status: 403 })
  if (targetId && !isHR && id !== context.employee?.id) throw Object.assign(new Error('Akses profil ditolak.'), { status: 403 })
  if (targetId && !isHR) throw Object.assign(new Error('Akses profil HR ditolak.'), { status: 403 })
  const {data, error} = await context.admin.from('employees').select('id,full_name,employee_number,department,position,email').eq('id', id).maybeSingle()
  if (error || !data) throw Object.assign(new Error('Karyawan tidak ditemukan.'), { status: 404 })
  return { ...context, employeeId: id, identity: data, isHR }
}
export function profileError(error: unknown) {
  const e = error as {message?:string,status?:number}
  return {status: e.status && e.status>=400 && e.status<600 ? e.status : 500, message: e.status ? e.message : 'Permintaan gagal. Periksa konfigurasi database profil.'}
}

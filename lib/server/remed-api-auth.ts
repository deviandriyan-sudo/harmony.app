import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import type { RemedRole } from '@/types/remed'
import { normalizeRemedRole } from '@/lib/remed'

export type RemedAccess = {
  id: string
  auth_user_id: string | null
  employee_id: string | null
  email: string
  role: RemedRole
  is_active: boolean
}

export type RemedEmployeeIdentity = {
  id: string
  employee_number: string | null
  full_name: string | null
  department: string | null
  position: string | null
  email: string | null
  is_active: boolean | null
  sinarmas_account_number: string | null
  sinarmas_account_name: string | null
}

export type RemedApiContext = {
  admin: SupabaseClient
  access: RemedAccess
  employee: RemedEmployeeIdentity | null
  authUserId: string
  authEmail: string
}

function bearer(request: NextRequest) {
  const header = request.headers.get('authorization') || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || ''
}

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw Object.assign(new Error('Konfigurasi server Supabase belum lengkap.'), { status: 500 })
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function requireRemedApi(
  request: NextRequest,
  allowedRoles?: RemedRole[],
): Promise<RemedApiContext> {
  const token = bearer(request)
  if (!token) throw Object.assign(new Error('Session Re-Med tidak ditemukan.'), { status: 401 })

  const admin = createAdminClient()
  const { data: authData, error: authError } = await admin.auth.getUser(token)
  if (authError || !authData.user) {
    throw Object.assign(new Error('Session Re-Med tidak valid. Silakan login ulang.'), { status: 401 })
  }

  const authUserId = authData.user.id
  const authEmail = String(authData.user.email || '').trim().toLowerCase()

  let access: RemedAccess | null = null

  const byId = await admin
    .from('remed_user_access')
    .select('id,auth_user_id,employee_id,email,role,is_active')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  if (!byId.error && byId.data) access = byId.data as RemedAccess

  if (!access && authEmail) {
    const byEmail = await admin
      .from('remed_user_access')
      .select('id,auth_user_id,employee_id,email,role,is_active')
      .ilike('email', authEmail)
      .maybeSingle()

    if (!byEmail.error && byEmail.data) {
      access = byEmail.data as RemedAccess
      if (access.auth_user_id !== authUserId) {
        const linkResult = await admin
          .from('remed_user_access')
          .update({ auth_user_id: authUserId, updated_at: new Date().toISOString() })
          .eq('id', access.id)
        if (!linkResult.error) access.auth_user_id = authUserId
      }
    }
  }

  const role = normalizeRemedRole(access?.role)
  if (!access || !role || access.is_active === false) {
    throw Object.assign(new Error('Akun ini belum memiliki akses Re-Med aktif.'), { status: 403 })
  }

  access.role = role

  if (allowedRoles?.length && !allowedRoles.includes(role)) {
    throw Object.assign(new Error('Akun ini tidak memiliki akses untuk proses tersebut.'), { status: 403 })
  }

  let employee: RemedEmployeeIdentity | null = null
  if (access.employee_id) {
    const result = await admin
      .from('employees')
      .select('id,employee_number,full_name,department,position,email,is_active,sinarmas_account_number,sinarmas_account_name')
      .eq('id', access.employee_id)
      .maybeSingle()
    if (!result.error && result.data) employee = result.data as RemedEmployeeIdentity
  }

  return { admin, access, employee, authUserId, authEmail }
}

export function remedApiError(error: unknown, fallback = 'Terjadi kesalahan pada Re-Med.') {
  const value = error as { message?: string; status?: number }
  return {
    status: Number(value?.status || 500),
    message: value?.message || fallback,
  }
}

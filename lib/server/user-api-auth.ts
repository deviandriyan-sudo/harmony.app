import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { assertHarmonySystemAvailable } from '@/lib/server/system-control'

export type HarmonyAppUser = {
  id: string
  email: string
  role: string
  employee_id: string | null
  is_active: boolean | null
}

export type HarmonyEmployeeIdentity = {
  id: string
  employee_number?: string | null
  machine_pin?: string | null
  full_name?: string | null
  department?: string | null
  position?: string | null
  email?: string | null
  supervisor_1?: string | null
  supervisor_2?: string | null
  join_date?: string | null
  is_active?: boolean | null
}

export type HarmonyApiContext = {
  admin: SupabaseClient
  appUser: HarmonyAppUser
  employee: HarmonyEmployeeIdentity | null
  authUserId: string
  authEmail: string
}

export function normalizeHarmonyText(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

export function normalizeHarmonyEmail(value: unknown) {
  return normalizeHarmonyText(value)
}

export function normalizeHarmonyRole(value: unknown) {
  return normalizeHarmonyText(value)
}

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || ''
}

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw Object.assign(
      new Error(
        'Supabase server env belum lengkap. NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib tersedia.',
      ),
      { status: 500 },
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function requireHarmonyApi(
  request: NextRequest,
): Promise<HarmonyApiContext> {
  const token = getBearerToken(request)

  if (!token) {
    throw Object.assign(new Error('Session login tidak ditemukan.'), {
      status: 401,
    })
  }

  const admin = createAdminClient()
  const { data: authData, error: authError } = await admin.auth.getUser(token)

  if (authError || !authData.user) {
    throw Object.assign(
      new Error('Session HARMONY tidak valid. Silakan login ulang.'),
      { status: 401 },
    )
  }

  const authEmail = normalizeHarmonyEmail(authData.user.email)
  let appUser: HarmonyAppUser | null = null

  const byId = await admin
    .from('app_users')
    .select('id,email,role,employee_id,is_active')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (!byId.error && byId.data) {
    appUser = byId.data as HarmonyAppUser
  }

  // Identity binding must match the verified JWT subject; email-only matching
  // can inherit someone else's app role after an account migration or mismatch.
  if (byId.error) throw byId.error

  if (!appUser || appUser.is_active === false) {
    throw Object.assign(
      new Error('Akun HARMONY tidak aktif atau belum terdaftar.'),
      { status: 403 },
    )
  }

  await assertHarmonySystemAvailable(admin, appUser.role)

  let employee: HarmonyEmployeeIdentity | null = null

  if (appUser.employee_id) {
    const byEmployeeId = await admin
      .from('employees')
      .select(
        'id,employee_number,machine_pin,full_name,department,position,email,supervisor_1,supervisor_2,join_date,is_active',
      )
      .eq('id', appUser.employee_id)
      .maybeSingle()

    if (!byEmployeeId.error && byEmployeeId.data) {
      employee = byEmployeeId.data as HarmonyEmployeeIdentity
    }
  }

  if (!employee && !appUser.employee_id && authEmail && authData.user.email_confirmed_at) {
    const byEmployeeEmail = await admin
      .from('employees')
      .select(
        'id,employee_number,machine_pin,full_name,department,position,email,supervisor_1,supervisor_2,join_date,is_active',
      )
      .ilike('email', authEmail)
      .maybeSingle()

    if (!byEmployeeEmail.error && byEmployeeEmail.data) {
      employee = byEmployeeEmail.data as HarmonyEmployeeIdentity
    }
  }

  if (normalizeHarmonyRole(appUser.role) === 'employee' && employee?.is_active === false) {
    throw Object.assign(new Error('Employee Master tidak aktif; akses karyawan ditolak.'), { status: 403 })
  }

  return {
    admin,
    appUser,
    employee,
    authUserId: authData.user.id,
    authEmail,
  }
}

export function harmonyApiError(
  error: unknown,
  fallback = 'Terjadi kesalahan pada server HARMONY.',
) {
  const value = error as { message?: string; status?: number }
  const status = Number(value?.status || 500)
  const message = value?.message || fallback

  return {
    status: Number.isFinite(status) ? status : 500,
    message,
  }
}

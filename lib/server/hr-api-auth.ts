import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

export type HRActor = {
  id: string
  email: string
  role: string
  employee_id: string | null
  is_active: boolean | null
}

export type HRApiContext = {
  admin: SupabaseClient
  actor: HRActor
  authUserId: string
  authEmail: string
}

const HR_ROLES = new Set([
  'hr',
  'admin',
  'administrator',
  'super_admin',
  'human_resources',
])

export function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

export function normalizeRole(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
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
    throw new Error(
      'Supabase server env belum lengkap. NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib tersedia.',
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function requireHRApi(request: NextRequest): Promise<HRApiContext> {
  const token = getBearerToken(request)
  if (!token) throw Object.assign(new Error('Token HR tidak ditemukan.'), { status: 401 })

  const admin = createAdminClient()
  const { data: authData, error: authError } = await admin.auth.getUser(token)

  if (authError || !authData.user) {
    throw Object.assign(new Error('Session HR tidak valid.'), { status: 401 })
  }

  const authEmail = normalizeEmail(authData.user.email)
  let actor: HRActor | null = null

  const byId = await admin
    .from('app_users')
    .select('id,email,role,employee_id,is_active')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (!byId.error && byId.data) actor = byId.data as HRActor

  if (!actor && authEmail) {
    const byEmail = await admin
      .from('app_users')
      .select('id,email,role,employee_id,is_active')
      .ilike('email', authEmail)
      .maybeSingle()
    if (!byEmail.error && byEmail.data) actor = byEmail.data as HRActor
  }

  if (!actor || actor.is_active === false || !HR_ROLES.has(normalizeRole(actor.role))) {
    throw Object.assign(new Error('Akun ini tidak memiliki akses HR Administrator.'), { status: 403 })
  }

  return {
    admin,
    actor,
    authUserId: authData.user.id,
    authEmail,
  }
}

export function apiError(error: unknown, fallback = 'Terjadi kesalahan pada server.') {
  const value = error as { message?: string; status?: number }
  const message = value?.message || fallback
  const status = Number(value?.status || 500)
  return { message, error: message, status: Number.isFinite(status) ? status : 500 }
}

export function isAllowedManagedRole(value: unknown): value is 'employee' | 'hr' {
  return ['employee', 'hr'].includes(normalizeRole(value))
}

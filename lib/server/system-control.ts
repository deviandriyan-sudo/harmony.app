import type { SupabaseClient } from '@supabase/supabase-js'

import { supabaseAdmin } from '@/lib/supabase-admin'

export type HarmonySystemControl = {
  systemEnabled: boolean
  emailEnabled: boolean
  maintenanceMessage: string
  updatedAt: string | null
  updatedByEmail: string | null
  configured: boolean
}

const DEFAULT_MESSAGE = 'HARMONY sedang dalam maintenance/pembaruan fitur. Silakan coba kembali setelah sistem diaktifkan oleh HR.'

function normalizeRole(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

export function isHarmonyHrRole(value: unknown) {
  return ['hr', 'admin', 'administrator', 'super_admin', 'human_resources'].includes(normalizeRole(value))
}

export async function getHarmonySystemControl(
  client: SupabaseClient = supabaseAdmin,
): Promise<HarmonySystemControl> {
  const result = await client
    .from('harmony_system_controls')
    .select('system_enabled,maintenance_message,updated_at,updated_by_email')
    .eq('id', 'main')
    .maybeSingle()

  if (result.error) {
    // Fail-open before the migration is installed so an incomplete deployment
    // never locks HR/users out of the existing application.
    return {
      systemEnabled: true,
      emailEnabled: true,
      maintenanceMessage: DEFAULT_MESSAGE,
      updatedAt: null,
      updatedByEmail: null,
      configured: false,
    }
  }

  const row = result.data as { system_enabled?: boolean | null; maintenance_message?: string | null; updated_at?: string | null; updated_by_email?: string | null } | null
  const systemEnabled = row?.system_enabled !== false

  return {
    systemEnabled,
    // One master switch controls both application availability and email delivery.
    emailEnabled: systemEnabled,
    maintenanceMessage: String(row?.maintenance_message || DEFAULT_MESSAGE).trim() || DEFAULT_MESSAGE,
    updatedAt: row?.updated_at || null,
    updatedByEmail: row?.updated_by_email || null,
    configured: true,
  }
}

export async function assertHarmonySystemAvailable(
  client: SupabaseClient,
  role: unknown,
) {
  if (isHarmonyHrRole(role)) return

  const control = await getHarmonySystemControl(client)
  if (!control.systemEnabled) {
    throw Object.assign(new Error(control.maintenanceMessage), {
      status: 503,
      code: 'HARMONY_MAINTENANCE',
    })
  }
}

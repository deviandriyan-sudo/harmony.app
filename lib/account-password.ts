'use client'

import { supabase } from '@/lib/supabase'

export type PasswordChangeSource = 'self_service' | 'recovery' | 'finance_self_service'

export type PasswordChangeResult = {
  message: string
  notification?: {
    ok: boolean
    message: string
  }
}

export async function changeHarmonyPassword(
  newPassword: string,
  source: PasswordChangeSource = 'self_service',
): Promise<PasswordChangeResult> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  if (!token) {
    throw new Error('Session tidak ditemukan. Silakan login ulang.')
  }

  const response = await fetch('/api/account/change-password', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      new_password: newPassword,
      source,
    }),
    cache: 'no-store',
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.message || 'Gagal memperbarui password.')
  }

  return payload as PasswordChangeResult
}

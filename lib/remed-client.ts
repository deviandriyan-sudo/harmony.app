'use client'

import { supabase } from '@/lib/supabase'

export async function remedFetch<T>(
  input: string,
  init: RequestInit = {},
): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  if (!token) {
    throw new Error('Session login tidak ditemukan. Silakan login ulang.')
  }

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  if (!(init.body instanceof FormData) && init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(input, {
    ...init,
    headers,
    cache: 'no-store',
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `Request gagal (${response.status}).`)
  }

  return payload as T
}

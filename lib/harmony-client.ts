'use client'

import { supabase } from '@/lib/supabase'

export class HarmonyRequestError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.name = 'HarmonyRequestError'
    this.status = status
  }
}

export async function harmonyFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new HarmonyRequestError(error.message, 401)

  const token = data.session?.access_token
  if (!token) throw new HarmonyRequestError('Session HARMONY tidak ditemukan.', 401)

  const headers = new Headers(init?.headers)
  headers.set('Authorization', `Bearer ${token}`)
  if (init?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const response = await fetch(input, {
    ...init,
    headers,
    cache: 'no-store',
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new HarmonyRequestError(
      payload?.message || payload?.error || `Request HARMONY gagal (${response.status}).`,
      response.status,
    )
  }

  return payload as T
}

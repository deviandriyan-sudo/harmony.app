'use client'

import { supabase } from '@/lib/supabase'
import { remedFetch } from '@/lib/remed-client'
import type { RemedSession } from '@/types/remed'

type SessionPayload = { session: RemedSession }
const UI_SESSION_TTL_MS = 8_000
let cachedToken = ''
let cachedUntil = 0
let cached: SessionPayload | null = null
let pending: Promise<SessionPayload> | null = null

/** Coalesce repeated UI reads; this is NOT an authorization cache.
 * All protected server requests still verify the Supabase Auth token and role. */
export async function getRemedUiSession(): Promise<SessionPayload> {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.access_token) {
    clearRemedUiSession()
    throw new Error(error?.message || 'Session login tidak ditemukan.')
  }
  const token = data.session.access_token
  if (cachedToken !== token) {
    clearRemedUiSession()
    cachedToken = token
  }
  if (cached && Date.now() < cachedUntil) return cached
  if (pending) return pending
  const request = remedFetch<SessionPayload>('/api/remed/session')
    .then((result) => {
      if (cachedToken === token) {
        cached = result
        cachedUntil = Date.now() + UI_SESSION_TTL_MS
      }
      return result
    })
    .catch((error) => {
      if (cachedToken === token) clearRemedUiSession()
      throw error
    })
    .finally(() => { if (pending === request) pending = null })
  pending = request
  return request
}

export function clearRemedUiSession() {
  cachedToken = ''
  cachedUntil = 0
  cached = null
  pending = null
}

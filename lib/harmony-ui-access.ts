'use client'

import { authReadEpoch, getAuthorizedToken, isCurrentRead, requestWithToken } from '@/lib/harmony-client'

export type HarmonyUiAccess = {
  kind: 'harmony' | 'finance'
  appUser: { id: string; email: string | null; role: string; employee_id: string | null; is_active: boolean | null } | null
  employee: { full_name?: string | null; is_active?: boolean | null } | null
  home: string
}

// Navigation-intent handoff only. Normal entries always revalidate. The
// verified result is single-use and expires after three seconds, not a role cache.
let warmed: { token: string; epoch: number; until: number; value: HarmonyUiAccess } | null = null
let warming: { token: string; epoch: number; promise: Promise<HarmonyUiAccess> } | null = null

export function clearHarmonyUiAccess() { warmed = null; warming = null }

export async function prewarmHarmonyUiAccess() {
  const token = await getAuthorizedToken()
  const epoch = authReadEpoch()
  if (warmed?.token === token && warmed.epoch === epoch && warmed.until > Date.now()) return
  if (warming?.token === token && warming.epoch === epoch) { await warming.promise; return }
  const promise = requestWithToken<HarmonyUiAccess>(token, '/api/auth/access')
  const entry = { token, epoch, promise }
  warming = entry
  try {
    const value = await promise
    if (warming === entry && isCurrentRead(token, epoch)) warmed = { token, epoch, value, until: Date.now() + 3_000 }
  } finally { if (warming === entry) warming = null }
}

export async function getHarmonyUiAccess(): Promise<HarmonyUiAccess> {
  const token = await getAuthorizedToken()
  const epoch = authReadEpoch()
  if (warmed?.token === token && warmed.epoch === epoch && warmed.until > Date.now()) {
    const value = warmed.value
    warmed = null
    return value
  }
  warmed = null
  if (warming?.token === token && warming.epoch === epoch) {
    const entry = warming
    warming = null
    return entry.promise
  }
  return requestWithToken<HarmonyUiAccess>(token, '/api/auth/access')
}

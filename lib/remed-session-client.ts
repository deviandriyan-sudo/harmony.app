'use client'

import { authReadEpoch, getAuthorizedIdentity, isCurrentRead, requestWithToken } from '@/lib/harmony-client'
import type { RemedSession } from '@/types/remed'

type SessionPayload = { session: RemedSession }
const UI_SESSION_TTL_MS = 8_000
let cachedToken = ''
let cachedUntil = 0
let cachedEpoch = -1
let cached: SessionPayload | null = null
let pending: Promise<SessionPayload> | null = null
let generation = 0

/** Session-bound UI handoff only; all protected APIs still verify access. */
export async function getRemedUiSession(): Promise<SessionPayload> {
  const { token, userId } = await getAuthorizedIdentity().catch(error => { clearRemedUiSession(); throw error })
  const epoch = authReadEpoch()
  if (cachedToken !== token || cachedEpoch !== epoch) {
    clearRemedUiSession()
    cachedToken = token
    cachedEpoch = epoch
  }
  if (cached && cached.session.authUserId === userId && Date.now() < cachedUntil) return cached
  if (pending) return pending
  const version = generation
  const current = () => generation === version && cachedToken === token && cachedEpoch === epoch && isCurrentRead(token, epoch)
  const request = requestWithToken<SessionPayload>(token, '/api/remed/session')
    .then(result => {
      if (!current()) throw new Error('Sesi Re-Med telah berubah.')
      if (!result.session || result.session.authUserId !== userId || !result.session.isActive) throw new Error('Identitas Re-Med tidak cocok atau tidak aktif.')
      cached = result
      cachedUntil = Date.now() + UI_SESSION_TTL_MS
      return result
    })
    .catch(error => { if (current()) clearRemedUiSession(); throw error })
    .finally(() => { if (pending === request) pending = null })
  pending = request
  return request
}

export function clearRemedUiSession() {
  generation++
  cachedToken = ''
  cachedEpoch = -1
  cachedUntil = 0
  cached = null
  pending = null
}

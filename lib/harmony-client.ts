'use client'

import { supabase } from '@/lib/supabase'
import { RequestCoordinator, canShareRead } from '@/lib/request-coordinator'

export class HarmonyRequestError extends Error {
  status: number
  constructor(message: string, status = 500) {
    super(message)
    this.name = 'HarmonyRequestError'
    this.status = status
  }
}

const coordinator = new RequestCoordinator()
// Never call another auth API from this synchronous listener. Invalidate any
// earlier in-flight read when Supabase replaces or removes the access token.
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((_event, session) => {
    coordinator.observeToken(session?.access_token || '')
  })
}
export function authReadEpoch() { return coordinator.epoch }
export function isCurrentRead(token: string, epoch: number) { return coordinator.isCurrent(token, epoch) }

export async function getAuthorizedIdentity() {
  const { data, error } = await supabase.auth.getSession()
  const token = data.session?.access_token || ''
  coordinator.observeToken(token)
  if (error || !token) throw new HarmonyRequestError(error?.message || 'Session HARMONY tidak ditemukan.', 401)
  if (!data.session?.user?.id) throw new HarmonyRequestError('Identitas sesi HARMONY tidak tersedia.', 401)
  return { token, userId: data.session.user.id }
}

export async function getAuthorizedToken() {
  return (await getAuthorizedIdentity()).token
}

export async function requestWithToken<T>(token: string, input: string, init?: RequestInit): Promise<T> {
  if (!input.startsWith('/api/') || input.startsWith('//')) throw new HarmonyRequestError('Alamat API tidak valid.', 400)
  const method = (init?.method || 'GET').toUpperCase()
  const read = method === 'GET' || method === 'HEAD'
  const epoch = coordinator.epoch
  if (!isCurrentRead(token, epoch)) throw new HarmonyRequestError('Sesi telah berubah. Muat ulang halaman.', 401)
  const execute = async () => {
    const headers = new Headers(init?.headers)
    headers.set('Authorization', `Bearer ${token}`)
    if (init?.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    // Bound reads only. A timed-out mutation may already have committed; never
    // automatically cancel/retry mutations or hide ambiguous write outcomes.
    const controller = read ? new AbortController() : null
    const signal = init?.signal
    const onAbort = () => controller?.abort(signal?.reason)
    if (signal?.aborted) onAbort()
    else if (controller) signal?.addEventListener('abort', onAbort, { once: true })
    const timer = controller ? setTimeout(() => controller.abort(new DOMException('Read timeout', 'TimeoutError')), 30_000) : undefined
    try {
      const response = await fetch(input, { ...init, headers, cache: 'no-store', signal: controller?.signal ?? signal })
      const payload = await response.json().catch(error => {
        if (read && response.ok) throw error
        return {}
      })
      if (!response.ok) throw new HarmonyRequestError(payload?.message || payload?.error || `Request HARMONY gagal (${response.status}).`, response.status)
      return payload as T
    } catch (error) {
      if (controller?.signal.aborted && !signal?.aborted) throw new HarmonyRequestError('Pengambilan data melebihi batas waktu. Silakan coba lagi.', 408)
      throw error
    } finally {
      if (timer !== undefined) clearTimeout(timer)
      if (controller) signal?.removeEventListener('abort', onAbort)
    }
  }
  if (read) return coordinator.run(token, input, execute, canShareRead(input, init))
  // A mutation must not join an earlier read on its subsequent refresh.
  coordinator.clearReads()
  try { return await execute() } finally { coordinator.clearReads() }
}

export async function harmonyFetch<T>(input: string, init?: RequestInit): Promise<T> {
  return requestWithToken<T>(await getAuthorizedToken(), input, init)
}

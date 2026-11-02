'use client'

import { useCallback, useEffect, useState } from 'react'
import { harmonyFetch } from '@/lib/harmony-client'
import { supabase } from '@/lib/supabase'

const UPDATED_EVENT = 'harmony:avatar-updated'
const CACHE_MS = 30_000
type ProfileDocuments = { documents: { id: string; category: string }[] }
let cachedUserToken = ''
let cachedUrl = ''
let cachedUntil = 0
let inflight: Promise<string> | null = null
let generation = 0

function invalidateAvatar() {
  generation += 1
  cachedUntil = 0
  inflight = null
}

async function readAvatar(): Promise<string> {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.access_token) return ''
  const token = data.session.access_token
  if (cachedUserToken !== token) {
    cachedUserToken = token
    cachedUrl = ''
    invalidateAvatar()
  }
  if (Date.now() < cachedUntil) return cachedUrl
  if (inflight) return inflight
  const requestGeneration = generation
  const request = (async () => {
    const profile = await harmonyFetch<ProfileDocuments>('/api/employee/profile')
    const latest = (profile.documents || []).find((document) => document.category === 'avatar')
    if (!latest) return ''
    const signed = await harmonyFetch<{ url: string }>(`/api/employee/profile/documents?id=${encodeURIComponent(latest.id)}`)
    return signed.url
  })().then((url) => {
    if (cachedUserToken === token && generation === requestGeneration) {
      cachedUrl = url
      cachedUntil = Date.now() + CACHE_MS
    }
    return url
  }).catch(() => {
    if (cachedUserToken === token && generation === requestGeneration) cachedUntil = Date.now() + 5_000
    return ''
  }).finally(() => { if (inflight === request) inflight = null })
  inflight = request
  return request
}

/** Short-lived signed URL reuse prevents duplicate profile requests on route changes. */
export function useEmployeeAvatar(enabled = true) {
  const [avatarUrl, setAvatarUrl] = useState('')
  const refresh = useCallback(async (force = false) => {
    if (!enabled) return
    if (force) invalidateAvatar()
    setAvatarUrl(await readAvatar())
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    let active = true
    // Avoid a state update after unmount without disrupting shared requests.
    void readAvatar().then((url) => { if (active) setAvatarUrl(url) })
    function updated() { void refresh(true) }
    function visible() { if (document.visibilityState === 'visible') void refresh() }
    window.addEventListener(UPDATED_EVENT, updated)
    document.addEventListener('visibilitychange', visible)
    return () => { active = false; window.removeEventListener(UPDATED_EVENT, updated); document.removeEventListener('visibilitychange', visible) }
  }, [enabled, refresh])
  return avatarUrl
}

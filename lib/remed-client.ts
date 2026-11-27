'use client'

import { harmonyFetch } from '@/lib/harmony-client'

/** Re-Med uses the same transport; server role checks remain independent. */
export function remedFetch<T>(input: string, init: RequestInit = {}): Promise<T> {
  return harmonyFetch<T>(input, init)
}

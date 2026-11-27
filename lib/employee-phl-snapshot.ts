'use client'

import { supabase } from '@/lib/supabase'
import { authReadEpoch, getAuthorizedIdentity, isCurrentRead } from '@/lib/harmony-client'

export type PHLRecord = {
  id: string
  employee_id: string
  phl_date: string | null
  valid_from: string | null
  expired_at: string | null
  status: string | null
  balance_days: number | null
  used_days: number | null
  remaining_days: number | null
  reason: string | null
  source: string | null
  display_state: 'active' | 'expired' | 'used'
  available_days: number
}

export type PHLSnapshot = {
  success: true
  employee_id: string
  as_of: string
  total_available_days: number
  active_ledger_balance: number
  legacy_balance: number
  expired_days: number
  used_days: number
  expiring_30_days: number
  next_expiry: string | null
  expiry_rule_days: number
  record_count: number
  records: PHLRecord[]
}

const asObject = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
const nonNegative = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0
const optionalNumber = (value: unknown) => value === null || nonNegative(value)
const nullableText = (value: unknown) => value === null || typeof value === 'string'
const dateText = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
const optionalDate = (value: unknown) => value === null || dateText(value)
const equalsDays = (a: number, b: number) => Math.abs(a - b) < 0.000001

/** Fail closed on incomplete, mixed-identity or inconsistent snapshots. */
export function validatePHLSnapshot(input: unknown, expectedEmployeeId?: string): PHLSnapshot {
  const data = asObject(input)
  if (!data || data.success !== true || typeof data.employee_id !== 'string' || !data.employee_id ||
      (expectedEmployeeId && data.employee_id !== expectedEmployeeId) || !dateText(data.as_of) ||
      data.expiry_rule_days !== 90 || !optionalDate(data.next_expiry) || !Array.isArray(data.records) ||
      data.record_count !== data.records.length || data.records.length > 1000) {
    throw new Error('Data saldo PHL tidak lengkap atau identitas tidak sesuai.')
  }
  for (const key of ['total_available_days', 'active_ledger_balance', 'legacy_balance', 'expired_days', 'used_days', 'expiring_30_days']) {
    if (!nonNegative(data[key])) throw new Error('Ringkasan saldo PHL tidak valid.')
  }
  const seen = new Set<string>()
  for (const raw of data.records) {
    const record = asObject(raw)
    if (!record || typeof record.id !== 'string' || !record.id || seen.has(record.id) ||
        record.employee_id !== data.employee_id || String(record.source).toLowerCase() !== 'attendance_phl_approved' ||
        String(record.status).toLowerCase() !== 'approved' || !optionalDate(record.phl_date) ||
        !optionalDate(record.valid_from) || !optionalDate(record.expired_at) || !nullableText(record.reason) ||
        !optionalNumber(record.balance_days) || !optionalNumber(record.used_days) || !optionalNumber(record.remaining_days) ||
        !nonNegative(record.available_days)) throw new Error('Record ledger PHL tidak valid.')
    seen.add(record.id)
    const remaining = Number(record.remaining_days ?? 0)
    const state = remaining <= 0 ? 'used' : typeof record.expired_at === 'string' && record.expired_at < data.as_of ? 'expired' : 'active'
    if (record.display_state !== state || !equalsDays(record.available_days, state === 'active' ? remaining : 0)) {
      throw new Error('Status kedaluwarsa PHL tidak konsisten.')
    }
  }
  const snapshot = data as unknown as PHLSnapshot
  const active = snapshot.records.reduce((sum, row) => sum + row.available_days, 0)
  const expired = snapshot.records.filter(row => row.display_state === 'expired').reduce((sum, row) => sum + (row.remaining_days ?? 0), 0)
  const used = snapshot.records.reduce((sum, row) => sum + (row.used_days ?? 0), 0)
  if (!equalsDays(active, snapshot.active_ledger_balance) || !equalsDays(expired, snapshot.expired_days) ||
      !equalsDays(used, snapshot.used_days) || !equalsDays(snapshot.total_available_days, active + snapshot.legacy_balance)) {
    throw new Error('Saldo PHL tidak sesuai dengan detail ledger.')
  }
  return snapshot
}

export async function fetchMyPHLSnapshot(expectedEmployeeId?: string): Promise<PHLSnapshot> {
  const { token } = await getAuthorizedIdentity()
  const epoch = authReadEpoch()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)
  try {
    const { data, error } = await supabase.rpc('harmony_get_my_phl_snapshot_v1').abortSignal(controller.signal)
    if (!isCurrentRead(token, epoch)) throw new Error('Sesi berubah. Silakan muat ulang saldo PHL.')
    if (error) throw new Error('Saldo PHL gagal dimuat. Silakan coba lagi.')
    return validatePHLSnapshot(data, expectedEmployeeId)
  } finally {
    clearTimeout(timer)
  }
}

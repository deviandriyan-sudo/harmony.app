'use client'

import { harmonyFetch } from '@/lib/harmony-client'

type BalanceWithAnnualTotal = {
  annual_total_available_days: number | null
  balance_integrity_status?: 'ok' | 'mismatch' | 'summary_only'
}

/**
 * One canonical employee balance contract shared by the dashboard and Cuti.
 * The server endpoint authenticates the employee, reconciles lifecycle in DB,
 * then reads the authoritative harmony_leave_balance_summary view.
 * The UI never credits entitlement or settles debt on its own.
 */
export async function fetchMyCanonicalLeaveBalance<T extends BalanceWithAnnualTotal>(): Promise<{
  balance: T
  warning: string | null
}> {
  const payload = await harmonyFetch<{
    success?: boolean
    balance_summary?: T | null
    balance_integrity_warning?: string | null
  }>('/api/employee/leave/postpone')

  const balance = payload.balance_summary
  if (payload.success !== true || !balance) {
    throw new Error('Ringkasan saldo cuti belum tersedia. Silakan refresh atau hubungi HR.')
  }

  const days = Number(balance.annual_total_available_days)
  if (balance.annual_total_available_days == null || !Number.isFinite(days) || days < 0) {
    throw new Error('Ringkasan saldo cuti tidak valid. Hubungi HR untuk audit saldo.')
  }

  return {
    balance,
    warning: payload.balance_integrity_warning || null,
  }
}

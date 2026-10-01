'use client'

import { REMED_STATUS_LABELS } from '@/lib/remed'
import type { RemedClaimStatus } from '@/types/remed'

const styles: Record<RemedClaimStatus, string> = {
  pending_hr: 'bg-amber-50 text-amber-700 border-amber-100',
  rejected_hr: 'bg-red-50 text-red-700 border-red-100',
  pending_finance: 'bg-blue-50 text-blue-700 border-blue-100',
  rejected_finance: 'bg-red-50 text-red-700 border-red-100',
  waiting_payment: 'bg-purple-50 text-purple-700 border-purple-100',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
  legacy_record: 'bg-zinc-100 text-zinc-700 border-zinc-200',
}

export function ClaimStatusBadge({ status }: { status: RemedClaimStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status] || styles.cancelled}`}>
      {REMED_STATUS_LABELS[status] || status}
    </span>
  )
}

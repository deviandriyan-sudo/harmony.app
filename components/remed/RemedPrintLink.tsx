'use client'

import Link from 'next/link'
import { Printer } from 'lucide-react'

/** Opens the existing, authenticated print route without replacing the review queue. */
export function RemedPrintLink({
  claimId,
  role,
  compact = false,
}: {
  claimId: string
  role: 'hr' | 'finance'
  compact?: boolean
}) {
  return (
    <Link
      href={`/remed/${role}/claims/${encodeURIComponent(claimId)}/print`}
      target="_blank"
      rel="noopener noreferrer"
      prefetch={false}
      aria-label="Buka formulir cetak klaim Re-Med"
      className={compact
        ? 'harmony-action-soft inline-flex min-h-9 items-center justify-center gap-1.5 px-3 text-xs font-semibold transition'
        : 'harmony-action-soft inline-flex min-h-10 items-center justify-center gap-2 px-3.5 text-xs font-semibold transition'}
    >
      <Printer size={14} /> Print Form
    </Link>
  )
}

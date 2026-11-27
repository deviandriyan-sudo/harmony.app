import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

/** Compact, data-first metric. Retains the icon prop for existing callers. */
export function CompactMetric({ label, value, href, accent = 'blue', fullValue = false }: {
  label: string
  value: string | number
  icon: LucideIcon
  href?: string
  accent?: 'blue' | 'green' | 'amber'
  fullValue?: boolean
}) {
  const tone = accent === 'amber' ? 'orange' : accent
  const content = (
    <div className="flex min-w-0 flex-col justify-between gap-2">
      <p className="truncate text-[13px] font-medium leading-5 harmony-text-secondary">{label}</p>
      <p className={`${fullValue ? 'whitespace-normal break-words text-[clamp(17px,2.1vw,26px)] leading-tight' : 'truncate text-[26px] leading-8'} font-semibold tabular-nums harmony-text-primary`} title={fullValue ? String(value) : undefined}>{value}</p>
    </div>
  )
  const cls = 'harmony-metric-card harmony-reference-metric harmony-glass-showcase-metric harmony-motion-metric block min-w-0 rounded-[14px] border px-4 py-4 transition-colors'
  return href
    ? <Link href={href} className={cls} data-tone={tone}>{content}</Link>
    : <div className={cls} data-tone={tone}>{content}</div>
}

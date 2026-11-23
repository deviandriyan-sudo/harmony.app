import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

/** Compact employee metric. Keep the icon prop for existing callers, but
 * prioritise the data rather than decorative icon tiles (Unslop pass 7). */
type CompactMetricProps = {
  label: string
  value: string | number
  icon: LucideIcon
  href?: string
  accent?: 'blue' | 'green' | 'amber'
}

export function CompactMetric({ label, value, href, accent = 'blue' }: CompactMetricProps) {
  const content = (
    <div className="harmony-metric-content min-w-0">
      <p className="harmony-metric-label truncate text-[13px] font-medium harmony-text-secondary">{label}</p>
      <p className="harmony-metric-value mt-2 break-words text-[25px] font-semibold leading-tight tabular-nums harmony-text-primary">{value}</p>
    </div>
  )
  const className = 'harmony-metric-card harmony-reference-metric harmony-glass-showcase-metric harmony-unslop-metric block min-w-0 rounded-[14px] border px-4 py-4 focus-visible:outline-2'
  const tone = accent === 'amber' ? 'orange' : accent
  return href
    ? <Link href={href} className={className} data-tone={tone}>{content}</Link>
    : <div className={className} data-tone={tone}>{content}</div>
}

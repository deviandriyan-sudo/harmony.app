import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

export function CompactMetric({ label, value, icon: Icon, href, accent = 'blue' }: {
  label: string; value: string | number; icon: LucideIcon; href?: string; accent?: 'blue' | 'green' | 'amber'
}) {
  const colors = accent === 'green' ? 'bg-emerald-50 text-emerald-700' : accent === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
  const content = <div className="flex min-w-0 items-center justify-between gap-3">
    <div className="min-w-0"><p className="truncate text-[11px] font-semibold text-slate-500">{label}</p><p className="mt-1 truncate text-[23px] font-bold leading-7 tracking-tight text-slate-900">{value}</p></div>
    <span className={`harmony-glass-metric-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${colors}`}><Icon size={20} strokeWidth={1.9} /></span>
  </div>
  const cls = 'harmony-metric-card harmony-reference-metric harmony-glass-showcase-metric group block min-w-0 rounded-[20px] border p-3.5 shadow-sm transition-shadow hover:shadow-md'
  const tone = accent === 'amber' ? 'orange' : accent
  return href ? <Link href={href} className={cls} data-tone={tone}>{content}</Link> : <div className={cls} data-tone={tone}>{content}</div>
}

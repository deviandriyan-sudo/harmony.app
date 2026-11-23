import type { LucideIcon } from 'lucide-react'

type StatCardProps = {
  title: string
  value: string
  description: string
  icon: LucideIcon
}

/** Shared stat: label, figure, context. No decorative icon tile or gradients. */
export function StatCard({ title, value, description }: StatCardProps) {
  return (
    <div className="harmony-metric-card harmony-unslop-metric rounded-[14px] border p-4 sm:p-5">
      <p className="harmony-metric-label text-[13px] font-medium harmony-text-secondary">{title}</p>
      <p className="harmony-metric-value mt-2 break-words text-[28px] font-semibold leading-none tabular-nums harmony-text-primary">{value}</p>
      <p className="mt-2 text-[13px] leading-5 harmony-text-secondary">{description}</p>
    </div>
  )
}

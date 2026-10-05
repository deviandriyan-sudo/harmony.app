import type { LucideIcon } from 'lucide-react'

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string
  value: string
  description: string
  icon: LucideIcon
}) {
  return (
    <div className="harmony-metric-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#858a93]">{title}</p>
          <h3 className="mt-2.5 text-[28px] font-semibold tracking-[-0.04em] text-[#17181b]">{value}</h3>
          <p className="mt-1.5 text-[12px] leading-5 text-[#747982]">{description}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-blue-100 bg-blue-50 text-blue-600 shadow-sm">
          <Icon size={20} strokeWidth={2.1} />
        </div>
      </div>
    </div>
  )
}

import type { LucideIcon } from 'lucide-react'

export function RemedStatCard({ label, value, helper, icon: Icon, tone = 'blue' }: { label: string; value: string; helper?: string; icon: LucideIcon; tone?: 'blue' | 'orange' | 'green' | 'purple' }) {
  return (
    <div className="harmony-metric-card harmony-glass-showcase-metric rounded-[20px] p-3.5" data-tone={tone}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#858a93]">{label}</p>
          <p className="mt-1 text-[21px] font-semibold tracking-[-0.04em] text-[#17181b]">{value}</p>
          {helper ? <p className="mt-1 text-[11px] leading-4 text-[#747982]">{helper}</p> : null}
        </div>
        <div className="harmony-glass-metric-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-blue-100 bg-blue-50 text-blue-700 shadow-sm"><Icon size={17} /></div>
      </div>
    </div>
  )
}

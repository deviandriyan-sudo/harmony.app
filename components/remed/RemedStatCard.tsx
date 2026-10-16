import type { LucideIcon } from 'lucide-react'

export function RemedStatCard({ label, value, helper, icon: Icon }: { label: string; value: string; helper?: string; icon: LucideIcon }) {
  return (
    <div className="harmony-metric-card rounded-[20px] p-3.5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#858a93]">{label}</p>
          <p className="mt-1 text-[21px] font-semibold tracking-[-0.04em] text-[#17181b]">{value}</p>
          {helper ? <p className="mt-1 text-[11px] leading-4 text-[#747982]">{helper}</p> : null}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-emerald-100 bg-emerald-50 text-emerald-700 shadow-sm"><Icon size={17} /></div>
      </div>
    </div>
  )
}

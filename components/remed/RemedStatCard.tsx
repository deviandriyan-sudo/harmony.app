import type { LucideIcon } from 'lucide-react'

export function RemedStatCard({ label, value, helper, icon: Icon }: { label: string; value: string; helper?: string; icon: LucideIcon }) {
  return (
    <div className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e8e93]">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-[#1d1d1f]">{value}</p>
          {helper ? <p className="mt-1 text-xs text-[#6e6e73]">{helper}</p> : null}
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef7f4] text-[#18794e]"><Icon size={20} /></div>
      </div>
    </div>
  )
}

import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function RemedPageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
}: {
  eyebrow: string
  title: string
  description?: string
  icon: LucideIcon
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 rounded-[24px] border border-black/[0.055] bg-white/[0.88] p-5 shadow-[0_10px_32px_rgba(15,23,42,.045)] backdrop-blur-xl sm:flex-row sm:items-end sm:justify-between sm:p-6">
      <div className="min-w-0">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">
          <Icon size={14} /> {eyebrow}
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#17181b] sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-[#747982]">{description}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  )
}

import Link from 'next/link'
import { ArrowUpRight, type LucideIcon } from 'lucide-react'

export type WorkspaceAction = {
  label: string
  description: string
  href: string
  icon: LucideIcon
  emphasis?: boolean
}

/** Small, role-specific route links; never reads or modifies workflow data. */
export function WorkspaceActions({ title = 'Akses cepat', actions }: { title?: string; actions: WorkspaceAction[] }) {
  return <section aria-label={title} className="harmony-action-tray">
    <div className="mb-2 flex items-center justify-between gap-3">
      <h2 className="text-[11px] font-bold uppercase tracking-[.11em] text-slate-500">{title}</h2>
      <p className="hidden text-[11px] text-slate-400 sm:block">Pilih pekerjaan yang ingin dilakukan</p>
    </div>
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {actions.map(({label, description, href, icon: Icon, emphasis}) =>
        <Link key={href} href={href} className={`harmony-workspace-action group flex min-w-0 items-center gap-3 rounded-[17px] border p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${emphasis ? 'harmony-workspace-action-primary' : ''}`}>
          <span className="harmony-action-glyph flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"><Icon size={17} aria-hidden="true" /></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{label}</span><span className="mt-0.5 block truncate text-[11px] opacity-70">{description}</span></span>
          <ArrowUpRight size={14} className="shrink-0 opacity-50 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  </section>
}

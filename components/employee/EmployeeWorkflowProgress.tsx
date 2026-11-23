'use client'

import Link from 'next/link'
import { ArrowUpRight, Check, Circle, GraduationCap, HeartPulse } from 'lucide-react'

export type ProgressStep = { label: string; status: 'done' | 'current' | 'waiting' | 'rejected' }
export type WorkflowOverview = {
  title: string
  subtitle: string
  status: string
  steps: ProgressStep[]
} | null

function TimelineCard({
  title, href, icon: Icon, overview, unavailable,
}: {
  title: string
  href: string
  icon: typeof GraduationCap
  overview: WorkflowOverview
  unavailable?: boolean
}) {
  return <section className="harmony-rc2q-workflow harmony-rc2o-panel min-w-0 p-4 sm:p-5">
    <header className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-base font-bold"><Icon size={19} className="harmony-rc2o-link"/>{title}</h2>
      <Link href={href} className="harmony-rc2o-link inline-flex items-center gap-1 text-xs font-semibold">Lihat Semua <ArrowUpRight size={14}/></Link>
    </header>
    {!overview ? <div className="harmony-rc2q-workflow-empty mt-4 rounded-2xl p-5 text-sm">
      {unavailable ? 'Progres belum dapat dimuat. Buka modul untuk memeriksa status.' : 'Belum ada pengajuan pribadi yang tercatat.'}
    </div> : <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0"><p className="harmony-rc2o-strong truncate text-sm font-semibold" title={overview.title}>{overview.title}</p>
          <p className="harmony-rc2o-muted mt-1 text-xs">{overview.subtitle}</p></div>
        <span className="harmony-rc2q-progress-status rounded-full px-3 py-1 text-xs font-semibold">{overview.status}</span>
      </div>
      <ol className="harmony-rc2q-progress-track mt-5 flex gap-2" aria-label={`Tahapan approval ${title}`}>
        {overview.steps.map((step,index)=><li key={`${index}-${step.label}`} className={`harmony-rc2q-progress-step ${step.status} min-w-0 flex-1`}>
          <div className="harmony-rc2q-progress-line flex items-center gap-1"><span className="harmony-rc2q-progress-dot flex h-6 w-6 shrink-0 items-center justify-center rounded-full border">{step.status==='done'?<Check size={13} strokeWidth={3}/>:step.status==='rejected'?'!':<Circle size={10} fill={step.status==='current'?'currentColor':'none'}/>}</span><span aria-hidden="true" className="harmony-rc2q-progress-bar h-1 min-w-0 flex-1 rounded-full"/></div>
          <span className="harmony-rc2o-muted mt-2 block text-[11px] leading-4">{step.label}</span>
        </li>)}
      </ol>
    </>}
  </section>
}

export function EmployeeWorkflowProgress({scaleup,remed,scaleupUnavailable,remedUnavailable}:{scaleup:WorkflowOverview;remed:WorkflowOverview;scaleupUnavailable:boolean;remedUnavailable:boolean}) {
  return <div id="harmony-approval-progress" className="grid gap-3 lg:grid-cols-2" aria-label="Progres persetujuan pengajuan">
    <TimelineCard title="SCALE UP" href="/employee/scale-up" icon={GraduationCap} overview={scaleup} unavailable={scaleupUnavailable}/>
    <TimelineCard title="Re-Med" href="/remed/employee/claims" icon={HeartPulse} overview={remed} unavailable={remedUnavailable}/>
  </div>
}

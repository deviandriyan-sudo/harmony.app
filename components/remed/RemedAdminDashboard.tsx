'use client'

import { useCallback, useEffect, useState } from 'react'
import { Banknote, ClipboardCheck, Download, FileText, History, RefreshCcw, Users, WalletCards } from 'lucide-react'
import { ClaimAdminActions } from '@/components/remed/ClaimAdminActions'
import { RemedClaimList } from '@/components/remed/RemedClaimList'
import { RemedStatCard } from '@/components/remed/RemedStatCard'
import { WorkspaceActions, type WorkspaceAction } from '@/components/dashboard/WorkspaceActions'
import { GlassHeroVisual } from '@/components/dashboard/GlassHeroVisual'
import { formatRupiah } from '@/lib/remed'
import { remedFetch } from '@/lib/remed-client'
import type { RemedClaim } from '@/types/remed'
import { downloadRemedClaimsXlsx } from '@/lib/export/remed-report'

type DashboardPayload = {
  stats?: { totalClaims?: number; pending?: number; paidCount?: number; paidTotal?: number }
  recentClaims?: RemedClaim[]
}

export function RemedAdminDashboard({ role }: { role: 'hr' | 'finance' }) {
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const load = useCallback(async () => {
    setError('')
    try { setData(await remedFetch<DashboardPayload>('/api/remed/dashboard')) }
    catch (issue: unknown) {
      setError(issue instanceof Error ? issue.message : `Gagal memuat dashboard Re-Med ${role.toUpperCase()}.`)
    }
  }, [role])
  useEffect(() => { void load() }, [load])
  const exportAll = async () => {
    setExporting(true)
    setError('')
    try {
      const response = await remedFetch<{ claims: RemedClaim[] }>('/api/remed/reports')
      if (!response.claims?.length) throw new Error('Belum ada klaim untuk diexport.')
      downloadRemedClaimsXlsx(response.claims, `${role.toUpperCase()}_SEMUA`)
    } catch (issue: unknown) {
      setError(issue instanceof Error ? issue.message : 'Export Excel gagal.')
    } finally {
      setExporting(false)
    }
  }
  const actions: WorkspaceAction[] = role === 'hr' ? [
    {label:'Review Klaim',description:'Proses klaim karyawan',href:'/remed/hr/claims',icon:ClipboardCheck,emphasis:true},
    {label:'Plafond Karyawan',description:'Lihat saldo & pengaturan',href:'/remed/hr/employees',icon:Users},
    {label:'Riwayat Klaim',description:'Arsip keputusan',href:'/remed/hr/history',icon:History},
  ] : [
    {label:'Review Klaim',description:'Periksa klaim yang masuk',href:'/remed/finance/claims',icon:ClipboardCheck,emphasis:true},
    {label:'Pembayaran',description:'Proses pencairan',href:'/remed/finance/payments',icon:Banknote},
    {label:'Riwayat Finance',description:'Audit dan klaim selesai',href:'/remed/finance/history',icon:History},
  ]
  return <section className={`harmony-glass-showcase harmony-glass-showcase-${role} mx-auto max-w-[1540px] space-y-4 p-4 sm:p-5 lg:p-6`}>
    <header className="harmony-remed-workspace-header harmony-glass-role-hero harmony-glass-role-remed flex flex-wrap items-center justify-between gap-3 rounded-[19px] border border-white/75 px-4 py-3 sm:px-5">
      <GlassHeroVisual role={role === 'finance' ? 'finance' : 'hr'} /><div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600/80">HARMONY · Re-Med</p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">{role === 'hr' ? 'Dashboard HR' : 'Dashboard Finance'}</h1>
        <p className="mt-1 text-xs text-slate-500">{role === 'hr' ? 'Kelola klaim dan plafond karyawan.' : 'Prioritaskan review klaim, pembayaran, dan riwayat.'}</p></div>
      <button type="button" className="harmony-button-secondary inline-flex min-h-10 items-center gap-1.5 px-3 text-xs font-semibold disabled:opacity-50" disabled={exporting} onClick={() => void exportAll()}><Download size={15}/> {exporting ? 'Menyiapkan...' : 'Export Excel'}</button>
    </header>
    <WorkspaceActions title={role === 'hr' ? 'Tindakan Re-Med HR' : 'Tindakan Finance'} actions={actions} />
    {error ? <div className="rounded-[22px] border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <RemedStatCard label="Total Klaim" value={String(data?.stats?.totalClaims ?? 0)} icon={FileText} tone="blue" />
      <RemedStatCard label={role === 'hr' ? 'Menunggu HR' : 'Perlu Diproses'} value={String(data?.stats?.pending ?? 0)} icon={ClipboardCheck} tone="orange" />
      <RemedStatCard label="Selesai Dibayar" value={String(data?.stats?.paidCount ?? 0)} icon={Banknote} tone="green" />
      <RemedStatCard label="Total Dibayar" value={formatRupiah(data?.stats?.paidTotal ?? 0)} icon={WalletCards} tone="purple" />
    </div>
    <div className="harmony-unified-surface">
      <div className="flex flex-col gap-3 border-b border-black/[0.055] p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <h2 className="harmony-section-title inline-flex items-center gap-2"><FileText size={16} className="text-blue-600" /> Klaim Terbaru</h2>
        <button type="button" onClick={() => void load()} className="harmony-button-secondary inline-flex min-h-10 items-center gap-2 px-4 text-xs"><RefreshCcw size={14}/> Refresh</button>
      </div>
      <div className="p-3 sm:p-4">
        <RemedClaimList claims={data?.recentClaims || []} showEmployee showBalanceImpact
          action={(claim) => <ClaimAdminActions claim={claim} role={role} onDone={load} />} />
      </div>
    </div>
  </section>
}

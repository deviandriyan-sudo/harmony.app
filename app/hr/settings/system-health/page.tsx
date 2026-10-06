'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  HeartPulse,
  RefreshCcw,
  ServerCog,
  ShieldCheck,
  XCircle,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { harmonyFetch } from '@/lib/harmony-client'

type HealthCheck = {
  key: string
  label: string
  status: 'ok' | 'warning' | 'error'
  detail: string
}

type HealthPayload = {
  status: 'ok' | 'warning' | 'error'
  appVersion: string
  requiredSchemaVersion: string
  databaseVersion: string | null
  checkedAt: string
  checks: HealthCheck[]
}

export default function SystemHealthPage() {
  const [payload, setPayload] = useState<HealthPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadHealth()
  }, [])

  async function loadHealth() {
    setLoading(true)
    setError('')
    try {
      setPayload(await harmonyFetch<HealthPayload>('/api/health'))
    } catch (value: any) {
      setPayload(null)
      setError(value?.message || 'System Health tidak dapat dibaca.')
    } finally {
      setLoading(false)
    }
  }

  const summary = useMemo(() => {
    const checks = payload?.checks || []
    return {
      ok: checks.filter((item) => item.status === 'ok').length,
      warning: checks.filter((item) => item.status === 'warning').length,
      error: checks.filter((item) => item.status === 'error').length,
    }
  }, [payload])

  return (
    <>
      <Topbar
        title="System Health"
        description="Status aplikasi, database, RPC, storage, dan environment HARMONY dalam satu halaman."
      />

      <section className="space-y-5 overflow-x-hidden p-4 sm:p-6">
        <div className="harmony-card rounded-[30px] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[#e8f2ff] text-[#007aff]">
                <ServerCog size={23} />
              </div>
              <div>
                <p className="text-lg font-bold text-[#1d1d1f]">HARMONY Stability Monitor</p>
                <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                  Gunakan halaman ini setelah migration, perubahan environment, atau deployment baru.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadHealth}
              disabled={loading}
              className="harmony-button-native-outline inline-flex min-h-11 items-center justify-center gap-2 rounded-[18px] border px-4 text-sm font-bold disabled:opacity-60"
            >
              <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Memeriksa...' : 'Refresh Health'}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-[24px] border border-red-200 bg-red-50/80 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="App Version" value={payload?.appVersion || '-'} icon={<HeartPulse size={20} />} />
          <Metric label="DB Schema" value={payload?.databaseVersion || '-'} icon={<Database size={20} />} />
          <Metric label="OK" value={String(summary.ok)} icon={<CheckCircle2 size={20} />} tone="ok" />
          <Metric label="Warning / Error" value={`${summary.warning} / ${summary.error}`} icon={<AlertTriangle size={20} />} tone={summary.error ? 'error' : 'warning'} />
        </div>

        <div className="harmony-card overflow-hidden rounded-[30px]">
          <div className="border-b border-black/5 px-5 py-4 sm:px-6">
            <p className="text-base font-bold text-[#1d1d1f]">Diagnostic Checks</p>
            <p className="mt-1 text-sm text-[#6e6e73]">
              {payload?.checkedAt ? `Terakhir diperiksa ${new Date(payload.checkedAt).toLocaleString('id-ID')}` : 'Belum diperiksa.'}
            </p>
          </div>

          <div className="divide-y divide-black/5">
            {(payload?.checks || []).map((check) => (
              <div key={check.key} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-start gap-3">
                  <StatusIcon status={check.status} />
                  <div>
                    <p className="text-sm font-bold text-[#1d1d1f]">{check.label}</p>
                    <p className="mt-1 text-sm leading-6 text-[#6e6e73]">{check.detail}</p>
                  </div>
                </div>
                <StatusBadge status={check.status} />
              </div>
            ))}

            {!loading && !payload?.checks?.length && !error && (
              <div className="px-6 py-12 text-center text-sm text-[#6e6e73]">Belum ada hasil diagnostic.</div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

function Metric({ label, value, icon, tone = 'neutral' }: { label: string; value: string; icon: React.ReactNode; tone?: 'neutral' | 'ok' | 'warning' | 'error' }) {
  const toneClass = tone === 'ok'
    ? 'bg-emerald-50 text-emerald-700'
    : tone === 'warning'
      ? 'bg-amber-50 text-amber-700'
      : tone === 'error'
        ? 'bg-red-50 text-red-700'
        : 'bg-[#e8f2ff] text-[#007aff]'

  return (
    <div className="harmony-metric-card rounded-[26px] p-5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-[16px] ${toneClass}`}>{icon}</div>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.08em] text-[#86868b]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#1d1d1f]">{value}</p>
    </div>
  )
}

function StatusIcon({ status }: { status: HealthCheck['status'] }) {
  if (status === 'ok') return <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />
  if (status === 'warning') return <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
  return <XCircle size={20} className="mt-0.5 shrink-0 text-red-600" />
}

function StatusBadge({ status }: { status: HealthCheck['status'] }) {
  const style = status === 'ok'
    ? 'bg-emerald-50 text-emerald-700'
    : status === 'warning'
      ? 'bg-amber-50 text-amber-700'
      : 'bg-red-50 text-red-700'
  const icon = status === 'ok' ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />

  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-xs font-bold sm:self-center ${style}`}>
      {icon} {status.toUpperCase()}
    </span>
  )
}

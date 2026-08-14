'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  RefreshCcw,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'
import {
  getCurrentPeriodMonthWita,
  getCutoffRange,
} from '@/lib/attendance-reporting'

export default function HRAttendanceSyncPage() {
  const [periodMonth, setPeriodMonth] = useState(getCurrentPeriodMonthWita())
  const [processing, setProcessing] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const range = useMemo(() => getCutoffRange(periodMonth), [periodMonth])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const queryPeriod = new URLSearchParams(window.location.search).get('period')
    if (queryPeriod && /^\d{4}-(0[1-9]|1[0-2])$/.test(queryPeriod)) {
      setPeriodMonth(queryPeriod)
    }
  }, [])

  async function handleSync() {
    setProcessing(true)
    setSuccessMessage('')
    setErrorMessage('')

    try {
      const confirmed = window.confirm(
        `Sinkron approved request ke attendance_logs untuk periode ${range.label}?\n\n` +
          'Proses ini hanya menyinkronkan pengajuan yang sudah approved. Tidak melakukan finalisasi dan tidak melakukan lock.',
      )

      if (!confirmed) return

      const { data, error } = await supabase.rpc(
        'sync_approved_leave_requests_to_attendance',
        { p_period_month: periodMonth },
      )

      if (error) throw error

      const message =
        typeof data === 'object' && data && 'message' in data
          ? String((data as { message?: unknown }).message || '')
          : ''

      setSuccessMessage(
        message ||
          `Approved request periode ${range.label} berhasil disinkronkan ke attendance_logs.`,
      )
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          'Sinkron approved request gagal. Pastikan RPC sync_approved_leave_requests_to_attendance tersedia.',
      )
    } finally {
      setProcessing(false)
    }
  }

  return (
    <>
      <Topbar
        title="Sinkron Approved Request"
        description="Sinkronisasi cuti, izin, sakit, tugas luar, dan klaim PHL yang sudah approved ke attendance_logs."
      />

      <section className="harmony-page-bg min-h-screen space-y-5 p-4 sm:p-6">
        {successMessage && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-700">
            <div className="mb-1 flex items-center gap-2 font-bold">
              <CheckCircle2 size={17} />
              Berhasil
            </div>
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-700">
            <div className="mb-1 flex items-center gap-2 font-bold">
              <AlertTriangle size={17} />
              Perhatian
            </div>
            {errorMessage}
          </div>
        )}

        <section className="relative overflow-hidden rounded-[32px] bg-[#1d1d1f] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.16)]">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#007aff]/30 blur-3xl" />

          <div className="relative">
            <Link
              href="/hr/attendance"
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 text-xs font-semibold text-white/75 hover:bg-white/15"
            >
              <ArrowLeft size={15} />
              Kembali ke Absensi
            </Link>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white/75">
              <RefreshCcw size={15} />
              Safe Request Sync
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight">
              Sinkron Approved Request
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60">
              Route ini hanya melakukan sinkronisasi request approved. Tidak melakukan
              HR Review, Finalisasi, atau Lock sehingga fungsi antar-route tidak lagi tumpang tindih.
            </p>
          </div>
        </section>

        <section className="harmony-card p-5 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[280px_1fr] lg:items-end">
            <label className="block">
              <span className="harmony-label">Periode Cutoff</span>
              <input
                type="month"
                min="2026-01"
                value={periodMonth}
                onChange={(event) => setPeriodMonth(event.target.value)}
                className="harmony-input"
              />
            </label>

            <div className="rounded-2xl border border-black/5 bg-[#f5f5f7] p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#86868b]">
                Rentang yang akan disinkron
              </p>
              <p className="mt-1 text-sm font-semibold text-[#1d1d1f]">
                {range.label}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-700">
            Jalankan sinkron setelah approval cuti/izin/PHL selesai. Setelah berhasil,
            cek <strong>Data Absensi</strong> atau <strong>Laporan Absensi</strong> untuk memastikan
            kategorinya sudah masuk ke tanggal yang benar.
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={handleSync}
              disabled={processing}
              className="harmony-button-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processing ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <RefreshCcw size={17} />
              )}
              {processing ? 'Menyinkronkan...' : 'Sinkron Sekarang'}
            </button>

            <Link href={`/hr/attendance/data?period=${periodMonth}`} className="harmony-button-secondary">
              Buka Data Absensi
            </Link>

            <Link href={`/hr/attendance/export?period=${periodMonth}`} className="harmony-button-secondary">
              Buka Laporan Absensi
            </Link>
          </div>
        </section>
      </section>
    </>
  )
}

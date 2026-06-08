'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  RefreshCcw,
  WalletCards,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Clock3,
  Fingerprint,
  Download,
  FileText,
  TimerReset,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'

type PHLBalanceRecord = {
  id: string

  employee_id: string | null
  employee_number: string | null
  machine_pin: string

  full_name: string | null
  department: string | null
  position: string | null

  phl_date: string

  check_in: string | null
  check_out: string | null

  status: string | null
  reason: string | null

  balance_days: number | null
  used_days: number | null
  remaining_days: number | null

  valid_from: string | null
  expired_at: string | null

  proof_file_url: string | null
  proof_file_name: string | null

  approved_by: string | null
  approved_at: string | null

  notes: string | null

  created_at: string | null
  updated_at: string | null
}

export default function HRPHLBalancePage() {
  const [records, setRecords] = useState<PHLBalanceRecord[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  async function fetchRecords() {
    setLoading(true)
    setErrorMessage('')

    const { data, error } = await supabase
      .from('phl_records')
      .select('*')
      .eq('status', 'approved')
      .order('expired_at', { ascending: true })
      .order('full_name', { ascending: true })

    if (error) {
      setErrorMessage(error.message)
      setRecords([])
      setLoading(false)
      return
    }

    setRecords(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchRecords()
  }, [])

  function getToday() {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  function getBalanceStatus(record: PHLBalanceRecord) {
    const today = getToday()
    const expiredAt = record.expired_at || ''
    const remainingDays = Number(record.remaining_days ?? record.balance_days ?? 0)

    if (remainingDays <= 0) {
      return 'used'
    }

    if (expiredAt && expiredAt < today) {
      return 'expired'
    }

    return 'active'
  }

  function getDaysLeft(expiredAt: string | null) {
    if (!expiredAt) return null

    const today = new Date(`${getToday()}T00:00:00`)
    const expired = new Date(`${expiredAt}T00:00:00`)

    const diff = expired.getTime() - today.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

    return days
  }

  const filteredRecords = useMemo(() => {
    const keyword = search.toLowerCase().trim()

    return records.filter((record) => {
      const balanceStatus = getBalanceStatus(record)

      const matchesKeyword =
        !keyword ||
        record.full_name?.toLowerCase().includes(keyword) ||
        record.employee_number?.toLowerCase().includes(keyword) ||
        record.machine_pin?.toLowerCase().includes(keyword) ||
        record.department?.toLowerCase().includes(keyword) ||
        record.position?.toLowerCase().includes(keyword) ||
        record.reason?.toLowerCase().includes(keyword) ||
        record.phl_date?.toLowerCase().includes(keyword) ||
        record.expired_at?.toLowerCase().includes(keyword)

      const matchesStatus =
        statusFilter === 'all' || balanceStatus === statusFilter

      return matchesKeyword && matchesStatus
    })
  }, [records, search, statusFilter])

  const totalApproved = records.length

  const activeCount = records.filter(
    (record) => getBalanceStatus(record) === 'active'
  ).length

  const expiredCount = records.filter(
    (record) => getBalanceStatus(record) === 'expired'
  ).length

  const usedCount = records.filter(
    (record) => getBalanceStatus(record) === 'used'
  ).length

  const totalRemainingDays = records.reduce((total, record) => {
    const status = getBalanceStatus(record)

    if (status !== 'active') return total

    return total + Number(record.remaining_days ?? record.balance_days ?? 0)
  }, 0)

  return (
    <>
      <Topbar
        title="Saldo PHL"
        description="Pantau detail saldo PHL karyawan yang sudah disetujui, termasuk masa berlaku, sisa hari, dan status aktif atau expired."
      />

      <section className="space-y-6 p-6">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Saldo Aktif"
            value={String(totalRemainingDays)}
            description="Total hari PHL aktif"
            icon={<WalletCards size={22} />}
            tone="blue"
          />

          <SummaryCard
            title="Approved"
            value={String(totalApproved)}
            description="Seluruh PHL disetujui"
            icon={<CheckCircle2 size={22} />}
            tone="green"
          />

          <SummaryCard
            title="Active Record"
            value={String(activeCount)}
            description="Masih berlaku"
            icon={<Clock3 size={22} />}
            tone="purple"
          />

          <SummaryCard
            title="Expired / Used"
            value={`${expiredCount}/${usedCount}`}
            description="Expired / terpakai"
            icon={<AlertTriangle size={22} />}
            tone="orange"
          />
        </div>

        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            Error: {errorMessage}
          </div>
        )}

        <div className="harmony-card overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-black/5 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#1d1d1f]">
                Detail Saldo PHL
              </h2>

              <p className="mt-1 text-sm text-[#6e6e73]">
                Data diambil dari PHL yang sudah berstatus Approved.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-black/5 bg-[#f5f5f7]/85 px-4 shadow-sm transition focus-within:border-[#007aff]/40 focus-within:bg-white focus-within:shadow-md">
                <Search size={18} className="text-[#6e6e73]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nama, PIN, unit, tanggal..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[#86868b] md:w-80"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="harmony-select md:w-48"
              >
                <option value="all">Semua Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="used">Used</option>
              </select>

              <button
                type="button"
                onClick={fetchRecords}
                className="harmony-button-secondary"
              >
                <RefreshCcw size={18} />
                Refresh
              </button>
            </div>
          </div>

          {loading && (
            <div className="p-6 text-sm text-[#6e6e73]">
              Memuat saldo PHL...
            </div>
          )}

          {!loading && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1350px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-black/5 bg-[#f5f5f7]/90 text-xs uppercase tracking-wide text-[#6e6e73]">
                    <th className="w-[22%] px-6 py-4 font-semibold">Employee</th>
                    <th className="w-[10%] px-6 py-4 font-semibold">Machine PIN</th>
                    <th className="w-[10%] px-6 py-4 font-semibold">Tanggal PHL</th>
                    <th className="w-[12%] px-6 py-4 font-semibold">Checklock</th>
                    <th className="w-[16%] px-6 py-4 font-semibold">Alasan</th>
                    <th className="w-[12%] px-6 py-4 font-semibold">Saldo</th>
                    <th className="w-[10%] px-6 py-4 font-semibold">Expired</th>
                    <th className="w-[8%] px-6 py-4 font-semibold">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRecords.map((record) => {
                    const balanceStatus = getBalanceStatus(record)
                    const daysLeft = getDaysLeft(record.expired_at)

                    return (
                      <tr
                        key={record.id}
                        className="border-b border-black/5 transition hover:bg-white/55"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1d1d1f] text-xs font-bold text-white">
                              {getInitials(record.full_name || record.machine_pin)}
                            </div>

                            <div className="min-w-0">
                              <div className="truncate font-semibold text-[#1d1d1f]">
                                {record.full_name || '-'}
                              </div>
                              <div className="mt-1 truncate text-xs text-[#6e6e73]">
                                {record.employee_number || '-'} · {record.department || '-'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1 text-xs font-bold text-[#0059b8]">
                            <Fingerprint size={13} />
                            {record.machine_pin}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-[#1d1d1f]">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <CalendarDays size={15} className="text-[#007aff]" />
                            {record.phl_date}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm">
                            <Clock3 size={14} className="text-[#007aff]" />
                            <div className="text-xs leading-4">
                              <div className="font-bold text-[#1d1d1f]">
                                In {record.check_in || '-'}
                              </div>
                              <div className="text-[#6e6e73]">
                                Out {record.check_out || '-'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="line-clamp-2 font-medium text-[#1d1d1f]">
                            {record.reason || '-'}
                          </div>

                          {record.proof_file_url && (
                            <a
                              href={record.proof_file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#007aff]"
                            >
                              <Download size={13} />
                              Lihat bukti
                            </a>
                          )}

                          {!record.proof_file_url && (
                            <div className="mt-2 inline-flex items-center gap-1 text-xs text-[#6e6e73]">
                              <FileText size={13} />
                              Tidak ada bukti
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm">
                            <WalletCards size={14} className="text-[#007aff]" />
                            <div className="text-xs leading-4">
                              <div className="font-bold text-[#1d1d1f]">
                                Sisa {Number(record.remaining_days ?? record.balance_days ?? 0)} hari
                              </div>
                              <div className="text-[#6e6e73]">
                                Total {Number(record.balance_days || 1)} · Pakai {Number(record.used_days || 0)}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-start gap-2">
                            <TimerReset
                              size={15}
                              className="mt-0.5 shrink-0 text-[#007aff]"
                            />

                            <div>
                              <div className="font-medium text-[#1d1d1f]">
                                {record.expired_at || '-'}
                              </div>
                              <div className="mt-1 text-xs text-[#6e6e73]">
                                {daysLeft === null
                                  ? '-'
                                  : daysLeft < 0
                                    ? `Lewat ${Math.abs(daysLeft)} hari`
                                    : `${daysLeft} hari lagi`}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <BalanceStatusBadge status={balanceStatus} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {filteredRecords.length === 0 && (
                <div className="p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#f5f5f7] text-[#007aff]">
                    <WalletCards size={24} />
                  </div>

                  <h3 className="mt-4 font-semibold text-[#1d1d1f]">
                    Saldo PHL tidak ditemukan
                  </h3>

                  <p className="mt-1 text-sm text-[#6e6e73]">
                    Saldo akan muncul setelah PHL berstatus Approved.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

function SummaryCard({
  title,
  value,
  description,
  icon,
  tone,
}: {
  title: string
  value: string
  description: string
  icon: React.ReactNode
  tone: 'blue' | 'green' | 'orange' | 'purple'
}) {
  const toneClass = {
    blue: 'text-[#007aff] bg-[#e8f2ff]',
    green: 'text-[#168034] bg-[#eaf8ee]',
    orange: 'text-[#b35b00] bg-[#fff4e5]',
    purple: 'text-[#7b2cbf] bg-[#f7edfc]',
  }[tone]

  return (
    <div className="harmony-card harmony-hover-lift p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-[#6e6e73]">
            {title}
          </p>

          <h3 className="mt-2 truncate text-3xl font-semibold tracking-tight text-[#1d1d1f]">
            {value}
          </h3>

          <p className="mt-1 line-clamp-1 text-xs leading-5 text-[#86868b]">
            {description}
          </p>
        </div>

        <div className={`rounded-2xl p-3 ${toneClass}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function BalanceStatusBadge({
  status,
}: {
  status: string
}) {
  const className =
    status === 'active'
      ? 'bg-green-50 text-green-700'
      : status === 'expired'
        ? 'bg-red-50 text-red-700'
        : 'bg-orange-50 text-orange-700'

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${className}`}>
      {status}
    </span>
  )
}

function getInitials(name: string) {
  const words = name.trim().split(' ').filter(Boolean)

  if (words.length === 0) return 'P'

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}
'use client'

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'

import Link from 'next/link'

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FilePlus2,
  Loader2,
  MinusCircle,
  Plus,
  RefreshCcw,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Trash2,
  WalletCards,
} from 'lucide-react'

import { Topbar } from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'

import type {
  HarmonyRequestTypeDefinition,
} from '@/lib/harmony-request-types'

type BalanceSummary = {
  employee_id: string
  employee_number: string | null
  full_name: string | null
  department: string | null
  position_name: string | null
  join_date: string | null

  annual_regular_days: number | null
  postpone_active_days: number | null
  postpone_expired_days: number | null

  postpone_manual_net_days?: number | null
  postpone_manual_add_days?: number | null
  postpone_manual_remove_days?: number | null

  annual_total_available_days: number | null
  phl_total_available_days: number | null

  latest_matured_at: string | null
  current_cycle_end: string | null
  next_postpone_expiry: string | null
  next_phl_expiry: string | null
}

type AnnualCycle = {
  id: string
  employee_id: string | null
  employee_number: string | null
  full_name: string | null

  cycle_start: string | null
  cycle_end: string | null
  matured_at: string | null

  remaining_days: number | null

  carry_forward_days: number | null
  carry_forward_used_days: number | null
  carry_forward_remaining_days: number | null
  carry_forward_expired_days: number | null
  carry_forward_expired_at: string | null

  status: string | null
  is_active: boolean | null
}

type ManualAdjustment = {
  id: string
  employee_id: string
  source_cycle_id: string

  action: string
  delta_days: number

  anniversary_date: string
  expired_at: string
  lifecycle_status: string

  note: string
  actor_email: string | null
  created_at: string
}

type PostponeAction =
  | 'add'
  | 'remove'

type TypeForm = {
  code: string
  label: string
  group_label: string
  request_category: string
  attendance_status: string
  description: string

  requires_proof: boolean
  requires_manual_time: boolean

  is_leave_like: boolean
  is_absence_like: boolean

  show_in_attendance: boolean
  show_in_leave: boolean

  sort_order: number
}

const initialTypeForm: TypeForm = {
  code: '',
  label: '',
  group_label: 'Keterangan Lain',
  request_category: 'other',
  attendance_status: 'absent',
  description: '',

  requires_proof: false,
  requires_manual_time: false,

  is_leave_like: false,
  is_absence_like: true,

  show_in_attendance: true,
  show_in_leave: true,

  sort_order: 500,
}

export default function HRLeaveAdministrationPage() {
  const [
    summaries,
    setSummaries,
  ] = useState<BalanceSummary[]>([])

  const [
    cycles,
    setCycles,
  ] = useState<AnnualCycle[]>([])

  const [
    adjustments,
    setAdjustments,
  ] = useState<ManualAdjustment[]>([])

  const [
    requestTypes,
    setRequestTypes,
  ] = useState<HarmonyRequestTypeDefinition[]>([])

  const [
    selectedEmployeeId,
    setSelectedEmployeeId,
  ] = useState('')

  const [
    selectedCycleId,
    setSelectedCycleId,
  ] = useState('')

  const [
    postponeAction,
    setPostponeAction,
  ] = useState<PostponeAction>('add')

  const [
    postponeDays,
    setPostponeDays,
  ] = useState(1)

  const [
    postponeNote,
    setPostponeNote,
  ] = useState('')

  const [
    typeForm,
    setTypeForm,
  ] = useState<TypeForm>(initialTypeForm)

  const [
    search,
    setSearch,
  ] = useState('')

  const [
    typeSearch,
    setTypeSearch,
  ] = useState('')

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    detailLoading,
    setDetailLoading,
  ] = useState(false)

  const [
    savingPostpone,
    setSavingPostpone,
  ] = useState(false)

  const [
    savingType,
    setSavingType,
  ] = useState(false)

  const [
    changingType,
    setChangingType,
  ] = useState('')

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('')

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('')

  const selectedSummary = useMemo(
    () =>
      summaries.find(
        (item) =>
          item.employee_id ===
          selectedEmployeeId,
      ) || null,
    [
      summaries,
      selectedEmployeeId,
    ],
  )

  const selectedCycle = useMemo(
    () =>
      cycles.find(
        (item) =>
          item.id ===
          selectedCycleId,
      ) || null,
    [
      cycles,
      selectedCycleId,
    ],
  )

  const filteredSummaries =
    useMemo(() => {
      const keyword =
        search.trim().toLowerCase()

      if (!keyword) {
        return summaries
      }

      return summaries.filter(
        (item) =>
          [
            item.full_name,
            item.employee_number,
            item.department,
            item.position_name,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLowerCase()
                .includes(keyword),
            ),
      )
    }, [
      summaries,
      search,
    ])

  const filteredTypes =
    useMemo(() => {
      const keyword =
        typeSearch
          .trim()
          .toLowerCase()

      if (!keyword) {
        return requestTypes
      }

      return requestTypes.filter(
        (item) =>
          [
            item.code,
            item.label,
            item.group_label,
            item.request_category,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLowerCase()
                .includes(keyword),
            ),
      )
    }, [
      requestTypes,
      typeSearch,
    ])

  const eligibleCycles =
    useMemo(() => {
      const today = todayISO()

      return cycles.filter(
        (cycle) => {
          if (!cycle.cycle_end) {
            return false
          }

          const anniversary =
            addDays(
              cycle.cycle_end,
              1,
            )

          const expiry =
            addMonths(
              anniversary,
              6,
            )

          return (
            anniversary <= today &&
            today <= expiry
          )
        },
      )
    }, [cycles])

  const computedCycleInfo =
    useMemo(() => {
      if (
        !selectedCycle?.cycle_end
      ) {
        return null
      }

      const anniversary =
        addDays(
          selectedCycle.cycle_end,
          1,
        )

      const expiry =
        addMonths(
          anniversary,
          6,
        )

      const originalRemaining =
        Number(
          selectedCycle.remaining_days ||
            0,
        )

      const alreadyPostponed =
        Number(
          selectedCycle
            .carry_forward_days ||
            0,
        )

      const availableToAdd =
        Math.max(
          originalRemaining -
            alreadyPostponed,
          0,
        )

      const activePostpone =
        Math.max(
          Number(
            selectedCycle
              .carry_forward_remaining_days ||
              0,
          ),
          0,
        )

      const manualNet =
        adjustments
          .filter(
            (item) =>
              item.source_cycle_id ===
              selectedCycle.id,
          )
          .reduce(
            (
              sum,
              item,
            ) =>
              sum +
              Number(
                item.delta_days ||
                  0,
              ),
            0,
          )

      return {
        anniversary,
        expiry,
        originalRemaining,
        alreadyPostponed,
        availableToAdd,
        activePostpone,
        manualNet,
      }
    }, [
      selectedCycle,
      adjustments,
    ])

  const totals =
    useMemo(() => {
      return summaries.reduce(
        (
          acc,
          item,
        ) => {
          acc.regular +=
            Number(
              item.annual_regular_days ||
                0,
            )

          acc.postpone +=
            Number(
              item.postpone_active_days ||
                0,
            )

          acc.expired +=
            Number(
              item.postpone_expired_days ||
                0,
            )

          acc.phl +=
            Number(
              item.phl_total_available_days ||
                0,
            )

          return acc
        },
        {
          regular: 0,
          postpone: 0,
          expired: 0,
          phl: 0,
        },
      )
    }, [summaries])

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    if (
      !selectedEmployeeId
    ) {
      setCycles([])
      setAdjustments([])
      setSelectedCycleId('')
      return
    }

    fetchEmployeeDetail(
      selectedEmployeeId,
    )
  }, [selectedEmployeeId])

  async function getToken() {
    const {
      data,
    } =
      await supabase.auth.getSession()

    const token =
      data.session?.access_token

    if (!token) {
      throw new Error(
        'Session login tidak ditemukan. Silakan login ulang.',
      )
    }

    return token
  }

  async function fetchAll() {
    setLoading(true)
    setErrorMessage('')

    try {
      const token =
        await getToken()

      const [
        balanceResponse,
        typeResponse,
      ] =
        await Promise.all([
          fetch(
            '/api/hr/leave/postpone-adjustments',
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
              cache:
                'no-store',
            },
          ),

          fetch(
            '/api/leave/types',
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
              cache:
                'no-store',
            },
          ),
        ])

      const balanceResult =
        await balanceResponse
          .json()
          .catch(() => null)

      const typeResult =
        await typeResponse
          .json()
          .catch(() => null)

      if (
        !balanceResponse.ok
      ) {
        throw new Error(
          balanceResult?.error ||
            'Gagal memuat saldo lifecycle.',
        )
      }

      if (
        !typeResponse.ok
      ) {
        throw new Error(
          typeResult?.error ||
            'Gagal memuat master jenis.',
        )
      }

      setSummaries(
        balanceResult?.summaries ||
          [],
      )

      setRequestTypes(
        typeResult?.types ||
          [],
      )

      if (
        !selectedEmployeeId &&
        balanceResult?.summaries
          ?.length
      ) {
        setSelectedEmployeeId(
          balanceResult
            .summaries[0]
            .employee_id,
        )
      }
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          'Gagal memuat administrasi cuti.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function fetchEmployeeDetail(
    employeeId: string,
  ) {
    setDetailLoading(true)
    setErrorMessage('')

    try {
      const token =
        await getToken()

      const response =
        await fetch(
          `/api/hr/leave/postpone-adjustments?employee_id=${encodeURIComponent(
            employeeId,
          )}`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
            cache:
              'no-store',
          },
        )

      const result =
        await response
          .json()
          .catch(() => null)

      if (!response.ok) {
        throw new Error(
          result?.error ||
            'Gagal memuat detail postpone.',
        )
      }

      setCycles(
        result?.cycles ||
          [],
      )

      setAdjustments(
        result?.adjustments ||
          [],
      )

      const firstEligible =
        (
          result?.cycles ||
          []
        ).find(
          (
            cycle: AnnualCycle,
          ) => {
            if (
              !cycle.cycle_end
            ) {
              return false
            }

            const anniversary =
              addDays(
                cycle.cycle_end,
                1,
              )

            const expiry =
              addMonths(
                anniversary,
                6,
              )

            const today =
              todayISO()

            return (
              anniversary <=
                today &&
              today <= expiry
            )
          },
        )

      setSelectedCycleId(
        firstEligible?.id ||
          '',
      )
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          'Gagal memuat detail employee.',
      )
    } finally {
      setDetailLoading(false)
    }
  }

  async function submitPostponeAdjustment(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setSuccessMessage('')
    setErrorMessage('')

    if (
      !selectedEmployeeId ||
      !selectedCycleId
    ) {
      setErrorMessage(
        'Pilih employee dan source cycle terlebih dahulu.',
      )
      return
    }

    if (
      postponeDays <= 0
    ) {
      setErrorMessage(
        'Jumlah postpone harus lebih dari 0 hari.',
      )
      return
    }

    if (
      postponeNote
        .trim()
        .length < 5
    ) {
      setErrorMessage(
        'Alasan/keterangan minimal 5 karakter.',
      )
      return
    }

    setSavingPostpone(true)

    try {
      const token =
        await getToken()

      const response =
        await fetch(
          '/api/hr/leave/postpone-adjustments',
          {
            method: 'POST',

            headers: {
              Authorization:
                `Bearer ${token}`,

              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                employee_id:
                  selectedEmployeeId,

                source_cycle_id:
                  selectedCycleId,

                action:
                  postponeAction,

                days:
                  postponeDays,

                note:
                  postponeNote.trim(),
              }),
          },
        )

      const result =
        await response
          .json()
          .catch(() => null)

      if (!response.ok) {
        throw new Error(
          result?.error ||
            'Gagal mengubah postpone manual.',
        )
      }

      setSuccessMessage(
        result?.result
          ?.message ||
          'Postpone manual berhasil diproses.',
      )

      setPostponeNote('')
      setPostponeDays(1)

      await fetchAll()

      await fetchEmployeeDetail(
        selectedEmployeeId,
      )
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          'Gagal memproses postpone manual.',
      )
    } finally {
      setSavingPostpone(false)
    }
  }

  function applyTypePreset(
    kind: string,
  ) {
    if (
      kind === 'leave'
    ) {
      setTypeForm(
        (prev) => ({
          ...prev,

          group_label:
            'Cuti',

          request_category:
            'leave',

          attendance_status:
            'leave',

          is_leave_like:
            true,

          is_absence_like:
            true,

          show_in_attendance:
            true,

          show_in_leave:
            true,
        }),
      )

      return
    }

    if (
      kind === 'sick'
    ) {
      setTypeForm(
        (prev) => ({
          ...prev,

          group_label:
            'Keterangan Lain',

          request_category:
            'sick',

          attendance_status:
            'sick',

          is_leave_like:
            false,

          is_absence_like:
            true,

          requires_proof:
            true,
        }),
      )

      return
    }

    if (
      kind === 'permit'
    ) {
      setTypeForm(
        (prev) => ({
          ...prev,

          group_label:
            'Keterangan Lain',

          request_category:
            'permit',

          attendance_status:
            'permit',

          is_leave_like:
            false,

          is_absence_like:
            true,
        }),
      )

      return
    }

    if (
      kind ===
      'official_travel'
    ) {
      setTypeForm(
        (prev) => ({
          ...prev,

          group_label:
            'Keterangan Lain',

          request_category:
            'official_travel',

          attendance_status:
            'official_travel',

          is_leave_like:
            false,

          is_absence_like:
            true,

          requires_proof:
            true,
        }),
      )

      return
    }

    if (
      kind ===
      'attendance'
    ) {
      setTypeForm(
        (prev) => ({
          ...prev,

          group_label:
            'Kehadiran',

          request_category:
            'attendance',

          attendance_status:
            'present',

          is_leave_like:
            false,

          is_absence_like:
            false,

          show_in_attendance:
            true,

          show_in_leave:
            false,
        }),
      )

      return
    }

    setTypeForm(
      (prev) => ({
        ...prev,

        group_label:
          'Keterangan Lain',

        request_category:
          'other',

        attendance_status:
          'absent',

        is_leave_like:
          false,

        is_absence_like:
          true,
      }),
    )
  }

  async function submitType(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setSuccessMessage('')
    setErrorMessage('')

    if (
      !typeForm.code.trim() ||
      !typeForm.label.trim()
    ) {
      setErrorMessage(
        'Kode dan nama jenis wajib diisi.',
      )
      return
    }

    setSavingType(true)

    try {
      const token =
        await getToken()

      const response =
        await fetch(
          '/api/hr/leave/request-types',
          {
            method: 'POST',

            headers: {
              Authorization:
                `Bearer ${token}`,

              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify(
                typeForm,
              ),
          },
        )

      const result =
        await response
          .json()
          .catch(() => null)

      if (!response.ok) {
        throw new Error(
          result?.error ||
            'Gagal menyimpan jenis.',
        )
      }

      setSuccessMessage(
        result?.result
          ?.message ||
          'Jenis berhasil disimpan.',
      )

      setTypeForm(
        initialTypeForm,
      )

      await fetchAll()
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          'Gagal menyimpan master jenis.',
      )
    } finally {
      setSavingType(false)
    }
  }

  async function toggleType(
    item:
      HarmonyRequestTypeDefinition,
  ) {
    setSuccessMessage('')
    setErrorMessage('')
    setChangingType(
      item.code,
    )

    try {
      const token =
        await getToken()

      const response =
        await fetch(
          '/api/hr/leave/request-types',
          {
            method: 'PATCH',

            headers: {
              Authorization:
                `Bearer ${token}`,

              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                code:
                  item.code,

                is_active:
                  !item.is_active,

                note:
                  item.is_active
                    ? 'Dinonaktifkan dari dashboard administrasi HR.'
                    : 'Diaktifkan kembali dari dashboard administrasi HR.',
              }),
          },
        )

      const result =
        await response
          .json()
          .catch(() => null)

      if (!response.ok) {
        throw new Error(
          result?.error ||
            'Gagal mengubah status jenis.',
        )
      }

      setSuccessMessage(
        result?.result
          ?.message ||
          'Status jenis berhasil diubah.',
      )

      await fetchAll()
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          'Gagal mengubah status master jenis.',
      )
    } finally {
      setChangingType('')
    }
  }

  return (
    <>
      <Topbar
        title="Administrasi Cuti & Ketidakhadiran"
        description="Pisahkan cuti matang, postpone, PHL, dan kelola master jenis keterangan tanpa menghapus histori lama."
      />

      <main className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/hr/leave"
              className="harmony-button-secondary w-fit"
            >
              <ArrowLeft
                size={17}
              />

              Kembali ke Cuti & Izin
            </Link>

            <Link
              href="/hr/leave/postpone"
              className="harmony-button-secondary w-fit"
            >
              <RotateCcw
                size={17}
              />

              Approval Postpone
            </Link>
          </div>

          <button
            type="button"
            onClick={fetchAll}
            disabled={loading}
            className="harmony-button-secondary"
          >
            <RefreshCcw
              size={17}
              className={
                loading
                  ? 'animate-spin'
                  : ''
              }
            />

            Refresh Lifecycle
          </button>
        </div>

        {successMessage && (
          <AlertBox
            tone="green"
            icon={
              <CheckCircle2
                size={18}
              />
            }
            title="Berhasil"
          >
            {successMessage}
          </AlertBox>
        )}

        {errorMessage && (
          <AlertBox
            tone="orange"
            icon={
              <AlertTriangle
                size={18}
              />
            }
            title="Perhatian"
          >
            {errorMessage}
          </AlertBox>
        )}

        <section className="relative overflow-hidden rounded-[32px] bg-[#1d1d1f] p-6 text-white shadow-[0_22px_70px_rgba(0,0,0,0.16)]">
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/70">
              <ShieldCheck
                size={15}
              />

              Leave Lifecycle Control
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight">
              Saldo tidak lagi bercampur
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
              Cuti tahunan matang,
              postpone aktif/expired,
              dan PHL dibaca sebagai
              sumber terpisah.
              Postpone expired otomatis
              keluar dari saldo aktif
              tanpa menghapus histori.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <HeroMetric
                label="Cuti Matang"
                value={`${formatNumber(
                  totals.regular,
                )} hari`}
              />

              <HeroMetric
                label="Postpone Aktif"
                value={`${formatNumber(
                  totals.postpone,
                )} hari`}
              />

              <HeroMetric
                label="Postpone Expired"
                value={`${formatNumber(
                  totals.expired,
                )} hari`}
              />

              <HeroMetric
                label="PHL Aktif"
                value={`${formatNumber(
                  totals.phl,
                )} hari`}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
          <div className="harmony-card overflow-hidden">
            <SectionTitle
              icon={
                <WalletCards
                  size={20}
                />
              }
              title="Administrasi Postpone Manual"
              description="Tambah/kurangi postpone secara audit-safe. Expiry otomatis 6 bulan setelah anniversary baru."
            />

            <div className="space-y-5 p-5 sm:p-6">
              <label className="block">
                <span className="harmony-label">
                  Cari Karyawan
                </span>

                <input
                  value={search}
                  onChange={(
                    event,
                  ) =>
                    setSearch(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Cari nama, NIP, unit, jabatan..."
                  className="harmony-input"
                />
              </label>

              <label className="block">
                <span className="harmony-label">
                  Karyawan
                </span>

                <select
                  value={
                    selectedEmployeeId
                  }
                  onChange={(
                    event,
                  ) =>
                    setSelectedEmployeeId(
                      event.target
                        .value,
                    )
                  }
                  className="harmony-select"
                >
                  <option value="">
                    Pilih karyawan
                  </option>

                  {filteredSummaries.map(
                    (item) => (
                      <option
                        key={
                          item.employee_id
                        }
                        value={
                          item.employee_id
                        }
                      >
                        {item.full_name ||
                          '-'}{' '}
                        ·{' '}
                        {item.employee_number ||
                          '-'}{' '}
                        ·{' '}
                        {item.department ||
                          '-'}
                      </option>
                    ),
                  )}
                </select>
              </label>

              {selectedSummary && (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <BalanceTile
                    label="Cuti Matang"
                    value={`${formatNumber(
                      selectedSummary.annual_regular_days,
                    )} hari`}
                    tone="blue"
                  />

                  <BalanceTile
                    label="Postpone Aktif"
                    value={`${formatNumber(
                      selectedSummary.postpone_active_days,
                    )} hari`}
                    tone="purple"
                  />

                  <BalanceTile
                    label="Postpone Expired"
                    value={`${formatNumber(
                      selectedSummary.postpone_expired_days,
                    )} hari`}
                    tone="red"
                  />

                  <BalanceTile
                    label="PHL Aktif"
                    value={`${formatNumber(
                      selectedSummary.phl_total_available_days,
                    )} hari`}
                    tone="green"
                  />
                </div>
              )}

              {detailLoading ? (
                <div className="flex items-center gap-2 rounded-2xl bg-[#f5f5f7] p-4 text-sm text-[#6e6e73]">
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />

                  Memuat cycle dan
                  histori postpone...
                </div>
              ) : (
                <form
                  onSubmit={
                    submitPostponeAdjustment
                  }
                  className="space-y-4 rounded-[26px] border border-black/5 bg-[#f8f8fa] p-5"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="harmony-label">
                        Source Cycle
                      </span>

                      <select
                        value={
                          selectedCycleId
                        }
                        onChange={(
                          event,
                        ) =>
                          setSelectedCycleId(
                            event
                              .target
                              .value,
                          )
                        }
                        className="harmony-select"
                      >
                        <option value="">
                          Pilih sisa cuti
                          periode sebelumnya
                        </option>

                        {eligibleCycles.map(
                          (
                            cycle,
                          ) => (
                            <option
                              key={
                                cycle.id
                              }
                              value={
                                cycle.id
                              }
                            >
                              {formatDate(
                                cycle.matured_at,
                              )}{' '}
                              -{' '}
                              {formatDate(
                                cycle.cycle_end,
                              )}{' '}
                              · Sisa{' '}
                              {formatNumber(
                                cycle.remaining_days,
                              )}{' '}
                              hari
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <label className="block">
                      <span className="harmony-label">
                        Tindakan
                      </span>

                      <select
                        value={
                          postponeAction
                        }
                        onChange={(
                          event,
                        ) =>
                          setPostponeAction(
                            event
                              .target
                              .value as PostponeAction,
                          )
                        }
                        className="harmony-select"
                      >
                        <option value="add">
                          Tambah Postpone
                          Manual
                        </option>

                        <option value="remove">
                          Kurangi / Hapus
                          Postpone Manual
                        </option>
                      </select>
                    </label>
                  </div>

                  {computedCycleInfo && (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <InfoBox
                        label="Anniversary Baru"
                        value={formatDate(
                          computedCycleInfo.anniversary,
                        )}
                      />

                      <InfoBox
                        label="Expired Otomatis"
                        value={formatDate(
                          computedCycleInfo.expiry,
                        )}
                      />

                      <InfoBox
                        label="Maks. Tambah"
                        value={`${formatNumber(
                          computedCycleInfo.availableToAdd,
                        )} hari`}
                      />

                      <InfoBox
                        label="Manual Net"
                        value={`${formatSigned(
                          computedCycleInfo.manualNet,
                        )} hari`}
                      />
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="harmony-label">
                        Jumlah Hari
                      </span>

                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={
                          postponeDays
                        }
                        onChange={(
                          event,
                        ) =>
                          setPostponeDays(
                            Number(
                              event
                                .target
                                .value ||
                                0,
                            ),
                          )
                        }
                        className="harmony-input"
                      />
                    </label>

                    <label className="block">
                      <span className="harmony-label">
                        Alasan /
                        Keterangan HR
                      </span>

                      <input
                        value={
                          postponeNote
                        }
                        onChange={(
                          event,
                        ) =>
                          setPostponeNote(
                            event
                              .target
                              .value,
                          )
                        }
                        placeholder="Contoh: koreksi carry forward periode 2025."
                        className="harmony-input"
                      />
                    </label>
                  </div>

                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-6 text-blue-700">
                    Contoh anniversary{' '}
                    <strong>
                      25 Februari
                    </strong>
                    : saldo periode
                    sebelumnya yang
                    dipostpone aktif mulai
                    25 Februari dan expired
                    pada{' '}
                    <strong>
                      25 Agustus
                    </strong>
                    . Setelah tanggal itu
                    saldo otomatis tidak
                    dapat dipakai, tetapi
                    histori tetap
                    tersimpan.
                  </div>

                  <button
                    type="submit"
                    disabled={
                      savingPostpone ||
                      !selectedCycleId
                    }
                    className="harmony-button-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingPostpone ? (
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                    ) : postponeAction ===
                      'add' ? (
                      <Plus
                        size={17}
                      />
                    ) : (
                      <MinusCircle
                        size={17}
                      />
                    )}

                    {savingPostpone
                      ? 'Memproses...'
                      : postponeAction ===
                          'add'
                        ? 'Tambah Postpone Manual'
                        : 'Kurangi Postpone Manual'}
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="harmony-card overflow-hidden">
            <SectionTitle
              icon={
                <Clock3
                  size={20}
                />
              }
              title="Audit Postpone Manual"
              description="Tidak ada hard delete. Pengurangan disimpan sebagai transaksi negatif agar histori tidak hilang."
            />

            <div className="max-h-[680px] space-y-3 overflow-y-auto p-5">
              {adjustments.length ===
              0 ? (
                <EmptyText text="Belum ada adjustment postpone manual untuk employee terpilih." />
              ) : (
                adjustments.map(
                  (item) => (
                    <div
                      key={
                        item.id
                      }
                      className="rounded-[22px] border border-black/5 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-[#1d1d1f]">
                            {Number(
                              item.delta_days ||
                                0,
                            ) >= 0
                              ? '+'
                              : ''}

                            {formatNumber(
                              item.delta_days,
                            )}{' '}
                            hari
                          </p>

                          <p className="mt-1 text-xs text-[#6e6e73]">
                            {
                              item.note
                            }
                          </p>
                        </div>

                        <StatusPill
                          active={
                            item.lifecycle_status !==
                            'expired'
                          }
                        />
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[#6e6e73]">
                        <span>
                          Anniversary:{' '}
                          {formatDate(
                            item.anniversary_date,
                          )}
                        </span>

                        <span>
                          Expiry:{' '}
                          {formatDate(
                            item.expired_at,
                          )}
                        </span>

                        <span>
                          Oleh:{' '}
                          {item.actor_email ||
                            '-'}
                        </span>

                        <span>
                          {formatDateTime(
                            item.created_at,
                          )}
                        </span>
                      </div>
                    </div>
                  ),
                )
              )}
            </div>
          </div>
        </section>

        <section className="harmony-card overflow-hidden">
          <SectionTitle
            icon={
              <Settings2
                size={20}
              />
            }
            title="Master Jenis Kehadiran & Ketidakhadiran"
            description="Satu master dipakai oleh dropdown Absensi dan Cuti & Izin. Hapus = nonaktifkan dari pilihan; histori lama tidak dihapus."
          />

          <div className="grid gap-6 p-5 sm:p-6 2xl:grid-cols-[0.85fr_1.15fr]">
            <form
              onSubmit={
                submitType
              }
              className="space-y-4 rounded-[26px] border border-black/5 bg-[#f8f8fa] p-5"
            >
              <h3 className="font-bold text-[#1d1d1f]">
                Tambah Jenis Baru
              </h3>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-700">
                Jenis custom dengan
                preset{' '}
                <strong>
                  Cuti / Leave Khusus
                </strong>{' '}
                diperlakukan sebagai
                cuti khusus dan tidak
                memotong saldo cuti
                tahunan otomatis.
                Pemotongan saldo tahunan
                tetap khusus kode sistem{' '}
                <strong>
                  Cuti Tahunan
                </strong>
                , sehingga custom type
                tidak merusak lifecycle
                saldo.
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="harmony-label">
                    Kode
                  </span>

                  <input
                    value={
                      typeForm.code
                    }
                    onChange={(
                      event,
                    ) =>
                      setTypeForm(
                        (
                          prev,
                        ) => ({
                          ...prev,

                          code:
                            slugify(
                              event
                                .target
                                .value,
                            ),
                        }),
                      )
                    }
                    placeholder="contoh: izin_keluarga"
                    className="harmony-input"
                  />
                </label>

                <label className="block">
                  <span className="harmony-label">
                    Nama Tampilan
                  </span>

                  <input
                    value={
                      typeForm.label
                    }
                    onChange={(
                      event,
                    ) =>
                      setTypeForm(
                        (
                          prev,
                        ) => ({
                          ...prev,

                          label:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    placeholder="Izin Keluarga"
                    className="harmony-input"
                  />
                </label>
              </div>

              <label className="block">
                <span className="harmony-label">
                  Preset Perlakuan
                </span>

                <select
                  onChange={(
                    event,
                  ) =>
                    applyTypePreset(
                      event.target
                        .value,
                    )
                  }
                  defaultValue="other"
                  className="harmony-select"
                >
                  <option value="other">
                    Ketidakhadiran Lain
                  </option>

                  <option value="leave">
                    Cuti / Leave Khusus
                  </option>

                  <option value="sick">
                    Sakit
                  </option>

                  <option value="permit">
                    Izin
                  </option>

                  <option value="official_travel">
                    Tugas Luar / Dinas
                  </option>

                  <option value="attendance">
                    Kehadiran
                  </option>
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="harmony-label">
                    Group Dropdown
                  </span>

                  <input
                    value={
                      typeForm.group_label
                    }
                    onChange={(
                      event,
                    ) =>
                      setTypeForm(
                        (
                          prev,
                        ) => ({
                          ...prev,

                          group_label:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    className="harmony-input"
                  />
                </label>

                <label className="block">
                  <span className="harmony-label">
                    Urutan
                  </span>

                  <input
                    type="number"
                    value={
                      typeForm.sort_order
                    }
                    onChange={(
                      event,
                    ) =>
                      setTypeForm(
                        (
                          prev,
                        ) => ({
                          ...prev,

                          sort_order:
                            Number(
                              event
                                .target
                                .value ||
                                500,
                            ),
                        }),
                      )
                    }
                    className="harmony-input"
                  />
                </label>
              </div>

              <label className="block">
                <span className="harmony-label">
                  Deskripsi
                </span>

                <textarea
                  value={
                    typeForm.description
                  }
                  onChange={(
                    event,
                  ) =>
                    setTypeForm(
                      (
                        prev,
                      ) => ({
                        ...prev,

                        description:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  placeholder="Keterangan penggunaan jenis ini."
                  className="harmony-textarea"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <CheckField
                  label="Wajib Bukti"
                  checked={
                    typeForm.requires_proof
                  }
                  onChange={(
                    value,
                  ) =>
                    setTypeForm(
                      (
                        prev,
                      ) => ({
                        ...prev,

                        requires_proof:
                          value,
                      }),
                    )
                  }
                />

                <CheckField
                  label="Wajib Jam Manual"
                  checked={
                    typeForm.requires_manual_time
                  }
                  onChange={(
                    value,
                  ) =>
                    setTypeForm(
                      (
                        prev,
                      ) => ({
                        ...prev,

                        requires_manual_time:
                          value,
                      }),
                    )
                  }
                />

                <CheckField
                  label="Tampil di Absensi"
                  checked={
                    typeForm.show_in_attendance
                  }
                  onChange={(
                    value,
                  ) =>
                    setTypeForm(
                      (
                        prev,
                      ) => ({
                        ...prev,

                        show_in_attendance:
                          value,
                      }),
                    )
                  }
                />

                <CheckField
                  label="Tampil di Cuti & Izin"
                  checked={
                    typeForm.show_in_leave
                  }
                  onChange={(
                    value,
                  ) =>
                    setTypeForm(
                      (
                        prev,
                      ) => ({
                        ...prev,

                        show_in_leave:
                          value,
                      }),
                    )
                  }
                />
              </div>

              <button
                type="submit"
                disabled={
                  savingType
                }
                className="harmony-button-primary disabled:opacity-50"
              >
                {savingType ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <FilePlus2
                    size={17}
                  />
                )}

                {savingType
                  ? 'Menyimpan...'
                  : 'Tambah ke Semua Dropdown'}
              </button>
            </form>

            <div>
              <label className="block">
                <span className="harmony-label">
                  Cari Jenis
                </span>

                <input
                  value={
                    typeSearch
                  }
                  onChange={(
                    event,
                  ) =>
                    setTypeSearch(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Cari kode, nama, group..."
                  className="harmony-input"
                />
              </label>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {filteredTypes.map(
                  (item) => (
                    <div
                      key={
                        item.code
                      }
                      className="rounded-[22px] border border-black/5 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-[#1d1d1f]">
                            {
                              item.label
                            }
                          </p>

                          <p className="mt-1 break-all text-[11px] font-semibold text-[#007aff]">
                            {
                              item.code
                            }
                          </p>
                        </div>

                        <StatusPill
                          active={
                            item.is_active
                          }
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-[#6e6e73]">
                        <span className="rounded-full bg-[#f5f5f7] px-2.5 py-1">
                          {
                            item.group_label
                          }
                        </span>

                        {item.show_in_attendance && (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                            Absensi
                          </span>
                        )}

                        {item.show_in_leave && (
                          <span className="rounded-full bg-purple-50 px-2.5 py-1 text-purple-700">
                            Cuti & Izin
                          </span>
                        )}

                        {item.requires_proof && (
                          <span className="rounded-full bg-orange-50 px-2.5 py-1 text-orange-700">
                            Wajib Bukti
                          </span>
                        )}

                        {item.is_system && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1">
                            System
                          </span>
                        )}
                      </div>

                      <p className="mt-3 text-xs leading-5 text-[#6e6e73]">
                        {item.description ||
                          '-'}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          toggleType(
                            item,
                          )
                        }
                        disabled={
                          changingType ===
                          item.code
                        }
                        className={[
                          'mt-4 inline-flex min-h-9 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold transition disabled:opacity-50',

                          item.is_active
                            ? 'bg-red-50 text-red-700 hover:bg-red-100'
                            : 'bg-green-50 text-green-700 hover:bg-green-100',
                        ].join(
                          ' ',
                        )}
                      >
                        {changingType ===
                        item.code ? (
                          <Loader2
                            size={
                              14
                            }
                            className="animate-spin"
                          />
                        ) : item.is_active ? (
                          <Trash2
                            size={
                              14
                            }
                          />
                        ) : (
                          <RotateCcw
                            size={
                              14
                            }
                          />
                        )}

                        {item.is_active
                          ? 'Hapus dari Dropdown'
                          : 'Aktifkan Kembali'}
                      </button>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}

function SectionTitle({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3 border-b border-black/5 p-5 sm:p-6">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8f2ff] text-[#007aff]">
        {icon}
      </div>

      <div>
        <h2 className="font-bold text-[#1d1d1f]">
          {title}
        </h2>

        <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
          {description}
        </p>
      </div>
    </div>
  )
}

function HeroMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-white/45">
        {label}
      </p>

      <p className="mt-2 text-xl font-semibold">
        {value}
      </p>
    </div>
  )
}

function BalanceTile({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone:
    | 'blue'
    | 'purple'
    | 'red'
    | 'green'
}) {
  const classes = {
    blue:
      'bg-blue-50 text-blue-700',

    purple:
      'bg-purple-50 text-purple-700',

    red:
      'bg-red-50 text-red-700',

    green:
      'bg-green-50 text-green-700',
  }[tone]

  return (
    <div
      className={`rounded-2xl p-4 ${classes}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
        {label}
      </p>

      <p className="mt-2 text-lg font-bold">
        {value}
      </p>
    </div>
  )
}

function InfoBox({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#86868b]">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-[#1d1d1f]">
        {value}
      </p>
    </div>
  )
}

function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange:
    (value: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-black/5 bg-white p-3 text-sm font-semibold text-[#1d1d1f]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(
          event,
        ) =>
          onChange(
            event.target
              .checked,
          )
        }
        className="h-4 w-4"
      />

      {label}
    </label>
  )
}

function StatusPill({
  active,
}: {
  active: boolean
}) {
  return (
    <span
      className={[
        'inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold',

        active
          ? 'bg-green-50 text-green-700'
          : 'bg-red-50 text-red-700',
      ].join(' ')}
    >
      {active
        ? 'Aktif'
        : 'Nonaktif'}
    </span>
  )
}

function AlertBox({
  tone,
  icon,
  title,
  children,
}: {
  tone:
    | 'green'
    | 'orange'

  icon: ReactNode
  title: string
  children: ReactNode
}) {
  const cls =
    tone === 'green'
      ? 'border-green-200 bg-green-50 text-green-700'
      : 'border-orange-200 bg-orange-50 text-orange-700'

  return (
    <div
      className={`rounded-2xl border p-4 text-sm leading-6 ${cls}`}
    >
      <div className="mb-1 flex items-center gap-2 font-bold">
        {icon}
        {title}
      </div>

      {children}
    </div>
  )
}

function EmptyText({
  text,
}: {
  text: string
}) {
  return (
    <div className="rounded-[22px] border border-dashed border-black/10 bg-[#f5f5f7]/70 p-5 text-sm text-[#6e6e73]">
      {text}
    </div>
  )
}

function todayISO() {
  const parts =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone:
          'Asia/Makassar',

        year:
          'numeric',

        month:
          '2-digit',

        day:
          '2-digit',
      },
    ).formatToParts(
      new Date(),
    )

  const map =
    new Map(
      parts.map(
        (part) => [
          part.type,
          part.value,
        ],
      ),
    )

  return `${map.get(
    'year',
  )}-${map.get(
    'month',
  )}-${map.get('day')}`
}

function parseDate(
  value?:
    | string
    | null,
) {
  if (!value) {
    return null
  }

  const date =
    new Date(
      `${value.slice(
        0,
        10,
      )}T00:00:00`,
    )

  return Number.isNaN(
    date.getTime(),
  )
    ? null
    : date
}

function formatISO(
  date: Date,
) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1,
  ).padStart(
    2,
    '0',
  )}-${String(
    date.getDate(),
  ).padStart(
    2,
    '0',
  )}`
}

function addDays(
  value: string,
  days: number,
) {
  const date =
    parseDate(value)

  if (!date) {
    return ''
  }

  date.setDate(
    date.getDate() +
      days,
  )

  return formatISO(
    date,
  )
}

function addMonths(
  value: string,
  months: number,
) {
  const date =
    parseDate(value)

  if (!date) {
    return ''
  }

  const originalDay =
    date.getDate()

  date.setDate(1)

  date.setMonth(
    date.getMonth() +
      months,
  )

  const lastDay =
    new Date(
      date.getFullYear(),
      date.getMonth() +
        1,
      0,
    ).getDate()

  date.setDate(
    Math.min(
      originalDay,
      lastDay,
    ),
  )

  return formatISO(
    date,
  )
}

function formatDate(
  value?:
    | string
    | null,
) {
  const date =
    parseDate(value)

  if (!date) {
    return value || '-'
  }

  return new Intl.DateTimeFormat(
    'id-ID',
    {
      day:
        '2-digit',

      month:
        'short',

      year:
        'numeric',
    },
  ).format(date)
}

function formatDateTime(
  value?:
    | string
    | null,
) {
  if (!value) {
    return '-'
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return new Intl.DateTimeFormat(
    'id-ID',
    {
      day:
        '2-digit',

      month:
        'short',

      year:
        'numeric',

      hour:
        '2-digit',

      minute:
        '2-digit',
    },
  ).format(date)
}

function formatNumber(
  value:
    | number
    | null
    | undefined,
) {
  const number =
    Number(value || 0)

  return Number.isInteger(
    number,
  )
    ? String(number)
    : number
        .toFixed(1)
        .replace(
          /\.0$/,
          '',
        )
}

function formatSigned(
  value:
    | number
    | null
    | undefined,
) {
  const number =
    Number(value || 0)

  return `${
    number >= 0
      ? '+'
      : ''
  }${formatNumber(
    number,
  )}`
}

function slugify(
  value: string,
) {
  return value
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]+/g,
      '_',
    )
    .replace(
      /^_+|_+$/g,
      '',
    )
    .slice(
      0,
      60,
    )
}
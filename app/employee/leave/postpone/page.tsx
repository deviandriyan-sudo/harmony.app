'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import type {
  FormEvent,
} from 'react'

import Link from 'next/link'

import {
  ArrowLeft,
  Loader2,
  RefreshCcw,
  RotateCcw,
  Send,
} from 'lucide-react'

import {
  supabase,
} from '@/lib/supabase'

import {
  Topbar,
} from '@/components/layout/Topbar'

import {
  sendHarmonyEmail,
} from '@/lib/notifications'

type AppUser = {
  id: string
  email: string
  role: string

  employee_id?:
    | string
    | null

  is_active?:
    | boolean
    | null
}

type Employee = {
  id: string

  full_name?:
    | string
    | null

  name?:
    | string
    | null

  employee_name?:
    | string
    | null

  employee_number?:
    | string
    | null

  nip?:
    | string
    | null

  machine_pin?:
    | string
    | null

  email?:
    | string
    | null

  department?:
    | string
    | null

  unit?:
    | string
    | null

  work_unit?:
    | string
    | null

  supervisor_1?:
    | string
    | null

  supervisor_2?:
    | string
    | null
}

type AnnualLeaveCycle = {
  id: string

  employee_number?:
    | string
    | null

  full_name?:
    | string
    | null

  department?:
    | string
    | null

  matured_at?:
    | string
    | null

  cycle_start?:
    | string
    | null

  cycle_end?:
    | string
    | null

  total_days?:
    | number
    | null

  used_days?:
    | number
    | null

  remaining_days?:
    | number
    | null

  is_active?:
    | boolean
    | null

  status?:
    | string
    | null
}

type LeavePostponeRequest = {
  id: string

  employee_number?:
    | string
    | null

  full_name?:
    | string
    | null

  department?:
    | string
    | null

  source_cycle_id?:
    | string
    | null

  remaining_days?:
    | number
    | null

  requested_days?:
    | number
    | null

  request_date?:
    | string
    | null

  old_cycle_end?:
    | string
    | null

  next_matured_at?:
    | string
    | null

  postpone_deadline?:
    | string
    | null

  new_expired_at?:
    | string
    | null

  reason?:
    | string
    | null

  approval_status?:
    | string
    | null

  supervisor_1?:
    | string
    | null

  supervisor_1_status?:
    | string
    | null

  supervisor_1_notes?:
    | string
    | null

  supervisor_2?:
    | string
    | null

  supervisor_2_status?:
    | string
    | null

  supervisor_2_notes?:
    | string
    | null

  hr_status?:
    | string
    | null

  hr_notes?:
    | string
    | null

  is_active?:
    | boolean
    | null

  created_at?:
    | string
    | null
}

type NotificationResult = {
  success: boolean
  count: number
  message: string
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

function formatDateToISO(
  date: Date,
) {
  const year =
    date.getFullYear()

  const month =
    String(
      date.getMonth() +
        1,
    ).padStart(
      2,
      '0',
    )

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      '0',
    )

  return `${year}-${month}-${day}`
}

function parseDate(
  value?:
    | string
    | null,
) {
  if (!value) {
    return null
  }

  const raw =
    value.slice(
      0,
      10,
    )

  const date =
    new Date(
      `${raw}T00:00:00`,
    )

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null
  }

  return date
}

function addMonths(
  dateString: string,
  months: number,
) {
  const date =
    parseDate(
      dateString,
    )

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

  return formatDateToISO(
    date,
  )
}

function addDays(
  dateString: string,
  days: number,
) {
  const date =
    parseDate(
      dateString,
    )

  if (!date) {
    return ''
  }

  date.setDate(
    date.getDate() +
      days,
  )

  return formatDateToISO(
    date,
  )
}

function subtractDays(
  dateString: string,
  days: number,
) {
  return addDays(
    dateString,
    -days,
  )
}

function formatDate(
  value?:
    | string
    | null,
) {
  if (!value) {
    return '-'
  }

  const date =
    parseDate(value)

  if (!date) {
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
    },
  ).format(date)
}

function getName(
  employee?:
    | Employee
    | null,
) {
  return (
    employee?.full_name ||
    employee?.employee_name ||
    employee?.name ||
    employee?.email ||
    '-'
  )
}

function getEmployeeNumber(
  employee?:
    | Employee
    | null,
) {
  return (
    employee?.employee_number ||
    employee?.nip ||
    employee?.machine_pin ||
    ''
  )
}

function getDepartment(
  employee?:
    | Employee
    | null,
) {
  return (
    employee?.department ||
    employee?.unit ||
    employee?.work_unit ||
    ''
  )
}

function normalize(
  value?:
    | string
    | null,
) {
  return String(
    value || '',
  )
    .trim()
    .toLowerCase()
}

function isBeforeOrSame(
  dateA: string,
  dateB: string,
) {
  const a =
    parseDate(dateA)

  const b =
    parseDate(dateB)

  if (
    !a ||
    !b
  ) {
    return false
  }

  return (
    a.getTime() <=
    b.getTime()
  )
}

function getStatusLabel(
  status?:
    | string
    | null,
) {
  const value =
    normalize(status)

  const map:
    Record<
      string,
      string
    > = {
    pending_supervisor:
      'Menunggu Atasan',

    pending_supervisor_2:
      'Menunggu Atasan 2',

    pending_hr:
      'Menunggu HR',

    approved:
      'Disetujui',

    rejected:
      'Ditolak',

    cancelled:
      'Dibatalkan',

    waiting_supervisor:
      'Menunggu Atasan',

    pending:
      'Pending',

    skipped:
      'Dilewati',
  }

  return (
    map[value] ||
    status ||
    '-'
  )
}

function statusClass(
  status?:
    | string
    | null,
) {
  const value =
    normalize(status)

  if (
    value ===
    'approved'
  ) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (
    value ===
      'rejected' ||
    value ===
      'cancelled'
  ) {
    return 'border-red-200 bg-red-50 text-red-700'
  }

  if (
    value ===
    'pending_hr'
  ) {
    return 'border-blue-200 bg-blue-50 text-blue-700'
  }

  return 'border-amber-200 bg-amber-50 text-amber-700'
}

function uniqueEmailList(
  values:
    Array<
      | string
      | null
      | undefined
    >,
) {
  return Array.from(
    new Set(
      values
        .map((value) =>
          String(
            value || '',
          )
            .trim()
            .toLowerCase(),
        )
        .filter((value) =>
          value.includes(
            '@',
          ),
        ),
    ),
  )
}

function getHarmonyBaseUrl() {
  if (
    typeof window !==
    'undefined'
  ) {
    return window
      .location
      .origin
  }

  return (
    process.env
      .NEXT_PUBLIC_SITE_URL ||
    ''
  )
}

function employeeMatchesReference(
  employee: Employee,
  reference: string,
) {
  const value =
    normalize(reference)

  if (!value) {
    return false
  }

  return [
    employee.id,
    employee.full_name,
    employee.employee_name,
    employee.name,
    employee.employee_number,
    employee.nip,
    employee.machine_pin,
    employee.email,
  ].some(
    (item) =>
      normalize(item) ===
      value,
  )
}

async function getHrNotificationEmails() {
  const {
    data,
    error,
  } =
    await supabase
      .from('app_users')
      .select(
        'email, role, is_active',
      )
      .eq(
        'is_active',
        true,
      )
      .ilike(
        'role',
        '%hr%',
      )

  if (error) {
    console.warn(
      'HR email lookup warning:',
      error,
    )

    return []
  }

  return uniqueEmailList(
    (
      data || []
    ).map(
      (item: any) =>
        item.email,
    ),
  )
}

async function getPostponeNotificationRecipients(
  employee: Employee,
) {
  const supervisorReferences =
    [
      employee.supervisor_1,
      employee.supervisor_2,
    ]
      .map((item) =>
        normalize(item),
      )
      .filter(Boolean)

  let supervisorEmails:
    string[] = []

  if (
    supervisorReferences.length >
    0
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          'employees',
        )
        .select(
          'id, full_name, name, employee_name, employee_number, nip, machine_pin, email, is_active',
        )
        .eq(
          'is_active',
          true,
        )

    if (error) {
      console.warn(
        'Supervisor email lookup warning:',
        error,
      )
    } else {
      supervisorEmails =
        uniqueEmailList(
          (
            (data ||
              []) as Employee[]
          )
            .filter(
              (item) =>
                supervisorReferences.some(
                  (
                    reference,
                  ) =>
                    employeeMatchesReference(
                      item,
                      reference,
                    ),
                ),
            )
            .map(
              (item) =>
                item.email,
            ),
        )
    }
  }

  const hrEmails =
    await getHrNotificationEmails()

  return {
    to:
      supervisorEmails.length >
      0
        ? supervisorEmails
        : hrEmails,

    cc:
      supervisorEmails.length >
      0
        ? hrEmails
        : [],

    supervisorCount:
      supervisorEmails.length,

    hrCount:
      hrEmails.length,
  }
}

async function notifyPostponeRequestSubmitted({
  employee,
  selectedCycle,
  requestedDays,
  oldCycleEnd,
  deadline,
  expiredAt,
  reason,
}: {
  employee: Employee
  selectedCycle: AnnualLeaveCycle
  requestedDays: number
  oldCycleEnd: string
  deadline: string
  expiredAt: string
  reason: string
}): Promise<NotificationResult> {
  const recipients =
    await getPostponeNotificationRecipients(
      employee,
    )

  const toEmails =
    uniqueEmailList(
      recipients.to,
    )

  const ccEmails =
    uniqueEmailList(
      recipients.cc,
    )

  if (
    toEmails.length === 0 &&
    ccEmails.length === 0
  ) {
    return {
      success: false,
      count: 0,
      message:
        'Email atasan atau HR belum ditemukan.',
    }
  }

  try {
    await sendHarmonyEmail({
      to:
        toEmails.length > 0
          ? toEmails
          : ccEmails,

      cc:
        toEmails.length > 0
          ? ccEmails
          : [],

      subject:
        `Pengajuan Postpone Cuti - ${getName(
          employee,
        )}`,

      title:
        'Pengajuan Postpone Cuti Baru',

      message: [
        `Karyawan ${getName(
          employee,
        )} mengajukan postpone sisa cuti tahunan.`,

        '',

        `NIP / Employee Number: ${
          getEmployeeNumber(
            employee,
          ) || '-'
        }`,

        `Departemen: ${
          getDepartment(
            employee,
          ) ||
          selectedCycle.department ||
          '-'
        }`,

        `Jumlah hari diajukan: ${requestedDays} hari`,

        `Cycle berakhir: ${formatDate(
          oldCycleEnd,
        )}`,

        `Batas pengajuan: ${formatDate(
          deadline,
        )}`,

        `Berlaku sampai: ${formatDate(
          expiredAt,
        )}`,

        '',

        `Alasan: ${
          reason || '-'
        }`,

        '',

        'Silakan buka HARMONY untuk melakukan pengecekan dan approval.',
      ].join('\n'),

      actionLabel:
        'Buka HARMONY',

      actionUrl:
        `${getHarmonyBaseUrl()}/login`,
    })

    return {
      success: true,

      count:
        uniqueEmailList([
          ...toEmails,
          ...ccEmails,
        ]).length,

      message:
        'Email notifikasi berhasil dikirim.',
    }
  } catch (error: any) {
    return {
      success: false,
      count: 0,

      message:
        error?.message ||
        'Email notifikasi gagal dikirim.',
    }
  }
}

export default function EmployeeLeavePostponePage() {
  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    saving,
    setSaving,
  ] = useState(false)

  const [
    appUser,
    setAppUser,
  ] =
    useState<AppUser | null>(
      null,
    )

  const [
    employee,
    setEmployee,
  ] =
    useState<Employee | null>(
      null,
    )

  const [
    cycles,
    setCycles,
  ] =
    useState<
      AnnualLeaveCycle[]
    >([])

  const [
    requests,
    setRequests,
  ] =
    useState<
      LeavePostponeRequest[]
    >([])

  const [
    selectedCycleId,
    setSelectedCycleId,
  ] = useState('')

  const [
    requestedDays,
    setRequestedDays,
  ] = useState(0)

  const [
    reason,
    setReason,
  ] = useState('')

  const [
    message,
    setMessage,
  ] = useState<{
    type:
      | 'success'
      | 'error'
      | 'info'

    text: string
  } | null>(null)

  const selectedCycle =
    useMemo(() => {
      return (
        cycles.find(
          (item) =>
            item.id ===
            selectedCycleId,
        ) || null
      )
    }, [
      cycles,
      selectedCycleId,
    ])

  const computed =
    useMemo(() => {
      if (
        !selectedCycle
          ?.cycle_end
      ) {
        return {
          oldCycleEnd:
            '',

          anniversaryDate:
            '',

          deadline:
            '',

          expiredAt:
            '',

          eligible:
            false,
        }
      }

      const oldCycleEnd =
        selectedCycle
          .cycle_end

      const anniversaryDate =
        addDays(
          oldCycleEnd,
          1,
        )

      const deadline =
        subtractDays(
          oldCycleEnd,
          7,
        )

      const expiredAt =
        addMonths(
          anniversaryDate,
          6,
        )

      const eligible =
        isBeforeOrSame(
          todayISO(),
          deadline,
        )

      return {
        oldCycleEnd,
        anniversaryDate,
        deadline,
        expiredAt,
        eligible,
      }
    }, [selectedCycle])

  const lockedByDeadline =
    Boolean(
      selectedCycle &&
        !computed.eligible,
    )

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    setMessage(null)

    try {
      const {
        data:
          authData,

        error:
          authError,
      } =
        await supabase.auth.getUser()

      if (
        authError ||
        !authData.user
      ) {
        throw new Error(
          'Session tidak ditemukan. Silakan login ulang.',
        )
      }

      const {
        data:
          appUserData,
      } =
        await supabase
          .from(
            'app_users',
          )
          .select('*')
          .eq(
            'id',
            authData
              .user.id,
          )
          .maybeSingle<AppUser>()

      setAppUser(
        appUserData || {
          id:
            authData
              .user.id,

          email:
            authData
              .user
              .email || '',

          role:
            'employee',

          employee_id:
            null,

          is_active:
            true,
        },
      )

      const {
        data:
          sessionData,

        error:
          sessionError,
      } =
        await supabase.auth.getSession()

      if (
        sessionError ||
        !sessionData
          .session
          ?.access_token
      ) {
        throw new Error(
          'Session login tidak valid. Silakan login ulang.',
        )
      }

      const response =
        await fetch(
          '/api/employee/leave/postpone',
          {
            method:
              'GET',

            headers: {
              Authorization:
                `Bearer ${sessionData.session.access_token}`,
            },

            cache:
              'no-store',
          },
        )

      const result =
        await response
          .json()
          .catch(() => null)

      if (
        !response.ok ||
        result?.success ===
          false
      ) {
        throw new Error(
          result?.error ||
            result?.message ||
            'Gagal memuat data postpone.',
        )
      }

      const currentEmployee =
        (
          result?.employee ||
          null
        ) as Employee | null

      const cycleRows =
        (
          result?.cycles ||
          []
        ) as AnnualLeaveCycle[]

      const requestRows =
        (
          result?.requests ||
          []
        ) as LeavePostponeRequest[]

      setEmployee(
        currentEmployee,
      )

      setCycles(
        cycleRows,
      )

      setRequests(
        requestRows,
      )

      const firstEligible =
        cycleRows.find(
          (cycle) => {
            if (
              !cycle.cycle_end ||
              Number(
                cycle.remaining_days ||
                  0,
              ) <= 0
            ) {
              return false
            }

            const deadline =
              subtractDays(
                cycle.cycle_end,
                7,
              )

            const hasActiveRequest =
              requestRows.some(
                (item) =>
                  item.source_cycle_id ===
                    cycle.id &&
                  ![
                    'rejected',
                    'cancelled',
                  ].includes(
                    String(
                      item.approval_status ||
                        '',
                    ).toLowerCase(),
                  ),
              )

            return (
              isBeforeOrSame(
                todayISO(),
                deadline,
              ) &&
              !hasActiveRequest
            )
          },
        )

      setSelectedCycleId(
        (current) =>
          current &&
          cycleRows.some(
            (cycle) =>
              cycle.id ===
              current,
          )
            ? current
            : firstEligible
                ?.id ||
              cycleRows[0]
                ?.id ||
              '',
      )

      if (
        firstEligible
      ) {
        setRequestedDays(
          Number(
            firstEligible.remaining_days ||
              0,
          ),
        )
      }
    } catch (error: any) {
      setEmployee(null)
      setCycles([])
      setRequests([])

      setMessage({
        type:
          'error',

        text:
          error?.message ||
          'Gagal memuat data postpone cuti.',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setSaving(true)
    setMessage(null)

    try {
      if (
        !employee ||
        !appUser
      ) {
        throw new Error(
          'Data karyawan tidak ditemukan.',
        )
      }

      if (
        !selectedCycle
      ) {
        throw new Error(
          'Cycle cuti belum dipilih.',
        )
      }

      const employeeNumber =
        getEmployeeNumber(
          employee,
        )

      if (
        !employeeNumber
      ) {
        throw new Error(
          'Nomor karyawan tidak ditemukan.',
        )
      }

      if (
        !selectedCycle.remaining_days ||
        Number(
          selectedCycle.remaining_days,
        ) <= 0
      ) {
        throw new Error(
          'Tidak ada sisa cuti tahunan yang dapat diajukan postpone.',
        )
      }

      if (
        requestedDays <=
        0
      ) {
        throw new Error(
          'Jumlah hari postpone harus lebih dari 0.',
        )
      }

      if (
        requestedDays >
        Number(
          selectedCycle.remaining_days ||
            0,
        )
      ) {
        throw new Error(
          'Jumlah postpone tidak boleh lebih besar dari sisa cuti.',
        )
      }

      if (
        !computed.oldCycleEnd ||
        !computed.deadline ||
        !computed.expiredAt
      ) {
        throw new Error(
          'Tanggal cycle cuti tidak valid.',
        )
      }

      if (
        !computed.eligible
      ) {
        throw new Error(
          `Pengajuan sudah melewati batas. Batas akhir pengajuan adalah ${formatDate(
            computed.deadline,
          )}.`,
        )
      }

      const existingActive =
        requests.find(
          (item) =>
            item.source_cycle_id ===
              selectedCycle.id &&
            ![
              'rejected',
              'cancelled',
            ].includes(
              normalize(
                item.approval_status,
              ),
            ),
        )

      if (
        existingActive
      ) {
        throw new Error(
          'Cycle ini sudah memiliki pengajuan postpone aktif.',
        )
      }

      const {
        data:
          sessionData,

        error:
          sessionError,
      } =
        await supabase.auth.getSession()

      if (
        sessionError ||
        !sessionData
          .session
          ?.access_token
      ) {
        throw new Error(
          'Session login tidak valid. Silakan login ulang.',
        )
      }

      const response =
        await fetch(
          '/api/employee/leave/postpone',
          {
            method:
              'POST',

            headers: {
              Authorization:
                `Bearer ${sessionData.session.access_token}`,

              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                source_cycle_id:
                  selectedCycle.id,

                requested_days:
                  requestedDays,

                reason:
                  reason
                    .trim() ||
                  null,
              }),
          },
        )

      const result =
        await response
          .json()
          .catch(() => null)

      if (
        !response.ok ||
        result?.success ===
          false
      ) {
        throw new Error(
          result?.error ||
            result?.message ||
            'Gagal membuat pengajuan postpone.',
        )
      }

      const serverResult =
        result?.result ||
        {}

      const notificationResult =
        await notifyPostponeRequestSubmitted({
          employee,

          selectedCycle,

          requestedDays,

          oldCycleEnd:
            serverResult
              .old_cycle_end ||
            computed
              .oldCycleEnd,

          deadline:
            serverResult
              .postpone_deadline ||
            computed
              .deadline,

          expiredAt:
            serverResult
              .expired_at ||
            computed
              .expiredAt,

          reason:
            reason.trim(),
        })

      setReason('')

      await fetchData()

      setMessage({
        type:
          'success',

        text:
          notificationResult.success
            ? `Pengajuan postpone berhasil dikirim dan email notifikasi terkirim ke ${notificationResult.count} penerima.`
            : `Pengajuan postpone berhasil dikirim, tetapi email notifikasi belum terkirim: ${notificationResult.message}`,
      })
    } catch (error: any) {
      setMessage({
        type:
          'error',

        text:
          error?.message ||
          'Gagal mengirim pengajuan postpone.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Topbar
        title="Pengajuan Postpone Cuti"
        description="Ajukan carry forward sisa cuti tahunan secara mandiri. Expiry otomatis 6 bulan setelah anniversary cuti berikutnya."
      />

      <main className="space-y-6 p-4 sm:p-6">
        <section className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
          <Link
            href="/employee/leave"
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
          >
            <ArrowLeft
              size={14}
            />

            Kembali ke Leave
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                <RotateCcw
                  size={14}
                />

                Annual Leave Carry
                Forward
              </div>

              <h1 className="mt-3 text-2xl font-bold text-[#1d1d1f] sm:text-3xl">
                Postpone Sisa Cuti
                Tahunan
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6e6e73]">
                Sisa cuti tahunan
                dapat diajukan postpone
                paling lambat H-7
                sebelum tanggal akhir
                cycle. Jika disetujui
                HR, sisa cuti berlaku
                sampai 6 bulan setelah
                anniversary cuti
                berikutnya. Contoh
                anniversary 25 Februari
                → expiry 25 Agustus.
              </p>
            </div>

            <button
              type="button"
              onClick={
                fetchData
              }
              disabled={
                loading
              }
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              {loading ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <RefreshCcw
                  size={16}
                />
              )}

              Refresh
            </button>
          </div>
        </section>

        {message && (
          <section
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
              message.type ===
              'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : message.type ===
                    'info'
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </section>
        )}

        <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-[#1d1d1f]">
              Form Pengajuan
            </h2>

            <p className="mt-1 text-sm text-[#6e6e73]">
              Pilih cycle cuti
              tahunan yang masih
              memiliki sisa cuti.
              Jika sudah melewati H-7
              sebelum cycle berakhir,
              form employee otomatis
              terkunci.
            </p>

            {loading ? (
              <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-500">
                <Loader2
                  size={16}
                  className="animate-spin"
                />

                Memuat data...
              </div>
            ) : cycles.length ===
              0 ? (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
                Tidak ada sisa cuti
                tahunan aktif yang
                bisa diajukan
                postpone.
              </div>
            ) : (
              <form
                onSubmit={
                  handleSubmit
                }
                className="mt-6 space-y-4"
              >
                <label className="block">
                  <span className="text-sm font-bold text-[#1d1d1f]">
                    Cycle Cuti Tahunan
                  </span>

                  <select
                    value={
                      selectedCycleId
                    }
                    onChange={(
                      event,
                    ) => {
                      const cycleId =
                        event
                          .target
                          .value

                      const cycle =
                        cycles.find(
                          (
                            item,
                          ) =>
                            item.id ===
                            cycleId,
                        )

                      setSelectedCycleId(
                        cycleId,
                      )

                      setRequestedDays(
                        Number(
                          cycle?.remaining_days ||
                            0,
                        ),
                      )
                    }}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400"
                    required
                  >
                    {cycles.map(
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
                            cycle.cycle_start,
                          )}{' '}
                          -{' '}
                          {formatDate(
                            cycle.cycle_end,
                          )}{' '}
                          · Sisa{' '}
                          {cycle.remaining_days ||
                            0}{' '}
                          hari
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoBox
                    label="Sisa Cuti"
                    value={`${selectedCycle?.remaining_days || 0} hari`}
                  />

                  <InfoBox
                    label="Batas Pengajuan"
                    value={formatDate(
                      computed.deadline,
                    )}
                  />

                  <InfoBox
                    label="Anniversary Baru"
                    value={formatDate(
                      computed.anniversaryDate,
                    )}
                  />

                  <InfoBox
                    label="Berlaku Sampai"
                    value={formatDate(
                      computed.expiredAt,
                    )}
                  />

                  <InfoBox
                    label="Status Eligibility"
                    value={
                      computed.eligible
                        ? 'Masih bisa diajukan'
                        : 'Terkunci otomatis H-7'
                    }
                    tone={
                      computed.eligible
                        ? 'green'
                        : 'red'
                    }
                  />
                </div>

                {lockedByDeadline && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                    Pengajuan postpone
                    untuk employee sudah
                    terkunci karena
                    melewati batas H-7
                    sebelum akhir cycle.
                  </div>
                )}

                <label className="block">
                  <span className="text-sm font-bold text-[#1d1d1f]">
                    Jumlah Hari
                    Diajukan
                  </span>

                  <input
                    type="number"
                    min={1}
                    max={Number(
                      selectedCycle?.remaining_days ||
                        0,
                    )}
                    value={
                      requestedDays
                    }
                    onChange={(
                      event,
                    ) =>
                      setRequestedDays(
                        Number(
                          event
                            .target
                            .value,
                        ),
                      )
                    }
                    disabled={
                      lockedByDeadline
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-[#1d1d1f]">
                    Alasan Pengajuan
                  </span>

                  <textarea
                    value={
                      reason
                    }
                    onChange={(
                      event,
                    ) =>
                      setReason(
                        event
                          .target
                          .value,
                      )
                    }
                    disabled={
                      lockedByDeadline
                    }
                    placeholder="Contoh: sisa cuti belum dapat digunakan karena kebutuhan operasional pekerjaan."
                    className="mt-2 min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </label>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    !computed.eligible
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1d1d1f] px-5 py-3 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Send
                      size={16}
                    />
                  )}

                  {lockedByDeadline
                    ? 'Terkunci H-7'
                    : 'Kirim Pengajuan Postpone'}
                </button>
              </form>
            )}
          </div>

          <div className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-[#1d1d1f]">
              Riwayat Pengajuan
            </h2>

            <p className="mt-1 text-sm text-[#6e6e73]">
              Pantau status approval
              atasan dan HR.
            </p>

            <div className="mt-5 space-y-3">
              {requests.length ===
              0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  Belum ada pengajuan
                  postpone.
                </div>
              ) : (
                requests.map(
                  (item) => (
                    <div
                      key={
                        item.id
                      }
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-bold text-[#1d1d1f]">
                            {item.requested_days ||
                              0}{' '}
                            hari postpone
                          </p>

                          <p className="mt-1 text-xs text-[#6e6e73]">
                            Cycle end:{' '}
                            {formatDate(
                              item.old_cycle_end,
                            )}{' '}
                            · Expired:{' '}
                            {formatDate(
                              item.new_expired_at,
                            )}
                          </p>
                        </div>

                        <span
                          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-bold ${statusClass(
                            item.approval_status,
                          )}`}
                        >
                          {getStatusLabel(
                            item.approval_status,
                          )}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
                        <MiniStatus
                          label="Atasan 1"
                          status={
                            item.supervisor_1_status
                          }
                        />

                        <MiniStatus
                          label="Atasan 2"
                          status={
                            item.supervisor_2_status
                          }
                        />

                        <MiniStatus
                          label="HR"
                          status={
                            item.hr_status
                          }
                        />
                      </div>

                      {item.reason && (
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {
                            item.reason
                          }
                        </p>
                      )}
                    </div>
                  ),
                )
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  )
}

function InfoBox({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string

  tone?:
    | 'default'
    | 'green'
    | 'red'
}) {
  const toneClass =
    tone === 'green'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'red'
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-slate-200 bg-slate-50 text-slate-700'

  return (
    <div
      className={`rounded-2xl border p-4 ${toneClass}`}
    >
      <p className="text-xs font-bold uppercase tracking-wide opacity-70">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold">
        {value}
      </p>
    </div>
  )
}

function MiniStatus({
  label,
  status,
}: {
  label: string

  status?:
    | string
    | null
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xs font-bold text-slate-700">
        {getStatusLabel(
          status,
        )}
      </p>
    </div>
  )
}
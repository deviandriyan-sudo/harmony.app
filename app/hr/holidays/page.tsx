'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Building2,
  Globe2,
  Plus,
  Search,
  Save,
  X,
  Pencil,
  Power,
  RefreshCcw,
  Sparkles,
  CalendarCheck2,
  Landmark,
  BadgeCheck,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { Topbar } from '@/components/layout/Topbar'
import type { Holiday } from '@/types/holiday'

type HolidayForm = {
  holiday_date: string
  holiday_name: string
  holiday_type: string
  year: number
  source: string
  is_active: boolean
}

const currentYear = new Date().getFullYear()

const initialForm: HolidayForm = {
  holiday_date: '',
  holiday_name: '',
  holiday_type: 'national_holiday',
  year: currentYear,
  source: 'manual',
  is_active: true,
}

export default function HRHolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState(String(currentYear))

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null)

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [form, setForm] = useState<HolidayForm>(initialForm)

  async function fetchHolidays() {
    setLoading(true)
    setErrorMessage('')

    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .order('holiday_date', { ascending: true })

    if (error) {
      setErrorMessage(error.message)
      setHolidays([])
      setLoading(false)
      return
    }

    setHolidays(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchHolidays()
  }, [])

  function updateForm(
    field: keyof HolidayForm,
    value: string | number | boolean
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  function resetForm() {
    setForm(initialForm)
    setEditingHolidayId(null)
    setShowForm(false)
    setErrorMessage('')
  }

  function handleAddNew() {
    setForm({
      ...initialForm,
      year: Number(yearFilter || currentYear),
    })
    setEditingHolidayId(null)
    setShowForm(true)
    setSuccessMessage('')
    setErrorMessage('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function handleEdit(holiday: Holiday) {
    setEditingHolidayId(holiday.id)

    setForm({
      holiday_date: holiday.holiday_date || '',
      holiday_name: holiday.holiday_name || '',
      holiday_type: holiday.holiday_type || 'national_holiday',
      year: Number(holiday.year || currentYear),
      source: holiday.source || 'manual',
      is_active: holiday.is_active ?? true,
    })

    setShowForm(true)
    setSuccessMessage('')
    setErrorMessage('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    if (!form.holiday_date || !form.holiday_name) {
      setErrorMessage('Tanggal libur dan nama libur wajib diisi.')
      setSaving(false)
      return
    }

    const payload = {
      holiday_date: form.holiday_date,
      holiday_name: form.holiday_name,
      holiday_type: form.holiday_type,
      year: form.year,
      source: form.source,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    }

    if (editingHolidayId) {
      const { error } = await supabase
        .from('holidays')
        .update(payload)
        .eq('id', editingHolidayId)

      if (error) {
        setErrorMessage(error.message)
        setSaving(false)
        return
      }

      setSuccessMessage('Data hari libur berhasil diperbarui.')
    } else {
      const { error } = await supabase
        .from('holidays')
        .insert(payload)

      if (error) {
        setErrorMessage(error.message)
        setSaving(false)
        return
      }

      setSuccessMessage('Data hari libur berhasil ditambahkan.')
    }

    setForm(initialForm)
    setEditingHolidayId(null)
    setShowForm(false)
    setSaving(false)

    await fetchHolidays()
  }

  async function handleToggleActive(holiday: Holiday) {
    const nextStatus = !holiday.is_active

    setErrorMessage('')
    setSuccessMessage('')

    const { error } = await supabase
      .from('holidays')
      .update({
        is_active: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', holiday.id)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setSuccessMessage(
      nextStatus
        ? 'Hari libur berhasil diaktifkan kembali.'
        : 'Hari libur berhasil dinonaktifkan.'
    )

    await fetchHolidays()
  }

  const years = useMemo(() => {
    const unique = new Set<string>()

    holidays.forEach((holiday) => {
      if (holiday.year) {
        unique.add(String(holiday.year))
      }
    })

    unique.add(String(currentYear))

    return Array.from(unique).sort()
  }, [holidays])

  const filteredHolidays = useMemo(() => {
    const keyword = search.toLowerCase().trim()

    return holidays.filter((holiday) => {
      const matchesKeyword =
        !keyword ||
        holiday.holiday_name?.toLowerCase().includes(keyword) ||
        holiday.holiday_date?.toLowerCase().includes(keyword) ||
        holiday.holiday_type?.toLowerCase().includes(keyword) ||
        holiday.source?.toLowerCase().includes(keyword) ||
        String(holiday.year || '').includes(keyword)

      const matchesType =
        typeFilter === 'all' || holiday.holiday_type === typeFilter

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && holiday.is_active) ||
        (statusFilter === 'inactive' && !holiday.is_active)

      const matchesYear =
        yearFilter === 'all' || String(holiday.year || '') === yearFilter

      return matchesKeyword && matchesType && matchesStatus && matchesYear
    })
  }, [holidays, search, typeFilter, statusFilter, yearFilter])

  const activeHolidays = holidays.filter((holiday) => holiday.is_active).length

  const nationalHolidays = holidays.filter(
    (holiday) => holiday.holiday_type === 'national_holiday'
  ).length

  const companyHolidays = holidays.filter(
    (holiday) => holiday.holiday_type === 'company_holiday'
  ).length

  const collectiveLeave = holidays.filter(
    (holiday) => holiday.holiday_type === 'collective_leave'
  ).length

  const inactiveHolidays = holidays.filter(
    (holiday) => !holiday.is_active
  ).length

  return (
    <>
      <Topbar
        title="Kalender Libur"
        description="Kelola hari libur nasional, cuti bersama, dan libur perusahaan untuk kebutuhan absensi dan PHL."
      />

      <section className="harmony-page-bg min-h-screen space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            title="Libur Aktif"
            value={String(activeHolidays)}
            description="Tanggal aktif kalender"
            icon={<CalendarDays size={20} />}
            tone="blue"
          />

          <SummaryCard
            title="Nasional"
            value={String(nationalHolidays)}
            description="Kalender nasional"
            icon={<Globe2 size={20} />}
            tone="green"
          />

          <SummaryCard
            title="Perusahaan"
            value={String(companyHolidays)}
            description="Internal memo"
            icon={<Building2 size={20} />}
            tone="orange"
          />

          <SummaryCard
            title="Cuti Bersama"
            value={String(collectiveLeave)}
            description="Input HR"
            icon={<CalendarCheck2 size={20} />}
            tone="purple"
          />

          <SummaryCard
            title="Inactive"
            value={String(inactiveHolidays)}
            description="Tidak dipakai sistem"
            icon={<Power size={20} />}
            tone="red"
          />
        </div>

        {successMessage && (
          <AlertBox
            type="success"
            message={successMessage}
          />
        )}

        {errorMessage && (
          <AlertBox
            type="error"
            message={`Error: ${errorMessage}`}
          />
        )}

        {showForm && (
          <div className="harmony-card harmony-slide-up overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-black/5 bg-white/55 p-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1.5 text-xs font-bold text-[#0059b8]">
                  <Sparkles size={14} />
                  Holiday Calendar
                </div>

                <h2 className="text-lg font-semibold text-[#1d1d1f]">
                  {editingHolidayId
                    ? 'Edit Hari Libur'
                    : 'Tambah Hari Libur'}
                </h2>

                <p className="mt-1 text-sm text-[#6e6e73]">
                  {editingHolidayId
                    ? 'Perbarui tanggal, nama, jenis, sumber, dan status hari libur.'
                    : 'Tambahkan hari libur nasional, cuti bersama, atau libur perusahaan.'}
                </p>
              </div>

              <button
                type="button"
                onClick={resetForm}
                className="harmony-button-secondary"
              >
                <X size={18} />
                Tutup
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-6 bg-white/35 p-5"
            >
              <div className="rounded-[26px] border border-black/5 bg-white/60 p-5 shadow-sm">
                <div className="mb-5 flex items-start gap-3">
                  <div className="rounded-2xl bg-[#e8f2ff] p-3 text-[#007aff]">
                    <CalendarDays size={18} />
                  </div>

                  <div>
                    <h3 className="font-semibold text-[#1d1d1f]">
                      Detail Hari Libur
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                      Data ini akan dipakai sistem untuk deteksi hari libur dan kandidat PHL.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <InputField
                    label="Tanggal Libur"
                    type="date"
                    value={form.holiday_date}
                    onChange={(value) => updateForm('holiday_date', value)}
                    required
                  />

                  <InputField
                    label="Nama Libur"
                    value={form.holiday_name}
                    onChange={(value) => updateForm('holiday_name', value)}
                    placeholder="Contoh: Hari Raya Idul Fitri"
                    required
                  />

                  <SelectField
                    label="Jenis Libur"
                    value={form.holiday_type}
                    onChange={(value) => updateForm('holiday_type', value)}
                    options={[
                      {
                        label: 'Libur Nasional',
                        value: 'national_holiday',
                      },
                      {
                        label: 'Cuti Bersama',
                        value: 'collective_leave',
                      },
                      {
                        label: 'Libur Perusahaan',
                        value: 'company_holiday',
                      },
                    ]}
                  />

                  <InputField
                    label="Tahun"
                    type="number"
                    value={String(form.year)}
                    onChange={(value) => updateForm('year', Number(value))}
                  />

                  <SelectField
                    label="Sumber"
                    value={form.source}
                    onChange={(value) => updateForm('source', value)}
                    options={[
                      {
                        label: 'Manual HR',
                        value: 'manual',
                      },
                      {
                        label: 'SKB Pemerintah',
                        value: 'government',
                      },
                      {
                        label: 'Internal Memo',
                        value: 'internal_memo',
                      },
                    ]}
                  />

                  <SelectField
                    label="Status"
                    value={form.is_active ? 'active' : 'inactive'}
                    onChange={(value) => updateForm('is_active', value === 'active')}
                    options={[
                      {
                        label: 'Active',
                        value: 'active',
                      },
                      {
                        label: 'Inactive',
                        value: 'inactive',
                      },
                    ]}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:justify-end">
                <button
                  type="button"
                  onClick={resetForm}
                  className="harmony-button-secondary"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="harmony-button-primary"
                >
                  <Save size={18} />
                  {saving
                    ? 'Menyimpan...'
                    : editingHolidayId
                      ? 'Update Data'
                      : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="harmony-card harmony-slide-up overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-black/5 bg-white/55 p-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#f7edfc] px-3 py-1.5 text-xs font-bold text-[#7b2cbf]">
                <Landmark size={14} />
                Holiday Master
              </div>

              <h2 className="text-lg font-semibold text-[#1d1d1f]">
                Master Kalender Libur
              </h2>

              <p className="mt-1 text-sm text-[#6e6e73]">
                Semua tanggal libur di halaman ini bisa diedit oleh HR dan akan dipakai untuk deteksi PHL.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <button
                type="button"
                onClick={fetchHolidays}
                className="harmony-button-secondary"
              >
                <RefreshCcw size={18} />
                Refresh
              </button>

              <button
                type="button"
                onClick={handleAddNew}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[18px] bg-[#007aff] px-5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(0,122,255,0.22)] transition hover:-translate-y-0.5 hover:bg-[#0067d8] hover:shadow-[0_18px_42px_rgba(0,122,255,0.28)]"
              >
                <Plus size={18} />
                Tambah Libur
              </button>
            </div>
          </div>

          <div className="grid gap-3 border-b border-black/5 bg-white/35 p-5 xl:grid-cols-[1fr_200px_200px_180px]">
            <div className="flex min-h-11 items-center gap-3 rounded-2xl border border-black/5 bg-[#f5f5f7]/85 px-4 shadow-sm transition focus-within:border-[#007aff]/40 focus-within:bg-white focus-within:shadow-md">
              <Search size={18} className="text-[#6e6e73]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari tanggal, nama, jenis..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-[#86868b]"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="harmony-select"
            >
              <option value="all">Semua Jenis</option>
              <option value="national_holiday">Libur Nasional</option>
              <option value="collective_leave">Cuti Bersama</option>
              <option value="company_holiday">Libur Perusahaan</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="harmony-select"
            >
              <option value="all">Semua Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
              className="harmony-select"
            >
              <option value="all">Semua Tahun</option>
              {years.map((year) => (
                <option
                  key={year}
                  value={year}
                >
                  {year}
                </option>
              ))}
            </select>
          </div>

          {loading && (
            <div className="p-6 text-sm text-[#6e6e73]">
              Loading data hari libur...
            </div>
          )}

          {!loading && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-black/5 bg-[#f5f5f7]/90 text-xs uppercase tracking-wide text-[#6e6e73]">
                    <th className="w-[14%] px-5 py-4 font-semibold">Tanggal</th>
                    <th className="w-[29%] px-5 py-4 font-semibold">Nama Libur</th>
                    <th className="w-[17%] px-5 py-4 font-semibold">Jenis</th>
                    <th className="w-[10%] px-5 py-4 font-semibold">Tahun</th>
                    <th className="w-[14%] px-5 py-4 font-semibold">Sumber</th>
                    <th className="w-[8%] px-5 py-4 font-semibold">Status</th>
                    <th className="w-[8%] px-5 py-4 text-center font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredHolidays.map((holiday) => (
                    <tr
                      key={holiday.id}
                      className="border-b border-black/5 transition hover:bg-white/55"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#e8f2ff] text-[#007aff]">
                            <CalendarDays size={18} />
                          </div>

                          <div>
                            <div className="font-semibold text-[#1d1d1f]">
                              {formatDisplayDate(holiday.holiday_date)}
                            </div>
                            <div className="mt-1 text-xs text-[#6e6e73]">
                              {formatDayName(holiday.holiday_date)}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-[#1d1d1f]">
                          {holiday.holiday_name || '-'}
                        </div>
                        <div className="mt-1 text-xs text-[#6e6e73]">
                          {holiday.holiday_date || '-'}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <HolidayTypeBadge type={holiday.holiday_type || '-'} />
                      </td>

                      <td className="px-5 py-3.5 text-[#1d1d1f]">
                        {holiday.year || '-'}
                      </td>

                      <td className="px-5 py-3.5 text-[#1d1d1f]">
                        {formatSource(holiday.source || '-')}
                      </td>

                      <td className="px-5 py-3.5">
                        <StatusBadge active={holiday.is_active ?? false} />
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(holiday)}
                            title="Edit hari libur"
                            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-black/5 bg-white text-[#1d1d1f] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#f5f5f7] hover:shadow-md"
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleActive(holiday)}
                            title={holiday.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                            className={[
                              'flex h-9 w-9 items-center justify-center rounded-2xl transition hover:-translate-y-0.5',
                              holiday.is_active
                                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                : 'bg-green-50 text-green-700 hover:bg-green-100',
                            ].join(' ')}
                          >
                            <Power size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredHolidays.length === 0 && (
                <div className="p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#f5f5f7] text-[#007aff]">
                    <CalendarDays size={24} />
                  </div>

                  <h3 className="mt-4 font-semibold text-[#1d1d1f]">
                    Data hari libur tidak ditemukan
                  </h3>

                  <p className="mt-1 text-sm text-[#6e6e73]">
                    Coba ubah filter pencarian, tahun, jenis, atau status.
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
  tone: 'blue' | 'green' | 'orange' | 'purple' | 'red'
}) {
  const toneClass = {
    blue: 'text-[#007aff] bg-[#e8f2ff]',
    green: 'text-[#168034] bg-[#eaf8ee]',
    orange: 'text-[#b35b00] bg-[#fff4e5]',
    purple: 'text-[#7b2cbf] bg-[#f7edfc]',
    red: 'text-red-700 bg-red-50',
  }[tone]

  return (
    <div className="harmony-card harmony-hover-lift harmony-slide-up p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm text-[#6e6e73]">
            {title}
          </p>

          <h3 className="mt-2 truncate text-2xl font-semibold tracking-tight text-[#1d1d1f]">
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

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="harmony-label">
        {label}
      </span>

      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="harmony-input"
      />
    </label>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: {
    label: string
    value: string
  }[]
}) {
  return (
    <label className="block">
      <span className="harmony-label">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="harmony-select"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function HolidayTypeBadge({
  type,
}: {
  type: string
}) {
  const label = formatHolidayType(type)

  const className =
    type === 'company_holiday'
      ? 'bg-orange-50 text-orange-700'
      : type === 'collective_leave'
        ? 'bg-blue-50 text-blue-700'
        : 'bg-green-50 text-green-700'

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${className}`}>
      {label}
    </span>
  )
}

function StatusBadge({
  active,
}: {
  active: boolean
}) {
  return (
    <span
      className={[
        'inline-flex rounded-full px-3 py-1 text-xs font-bold',
        active
          ? 'bg-green-50 text-green-700'
          : 'bg-red-50 text-red-700',
      ].join(' ')}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function AlertBox({
  type,
  message,
}: {
  type: 'success' | 'error'
  message: string
}) {
  const className =
    type === 'success'
      ? 'border-green-200 bg-green-50 text-green-700'
      : 'border-red-200 bg-red-50 text-red-600'

  return (
    <div className={`rounded-2xl border p-4 text-sm ${className}`}>
      {message}
    </div>
  )
}

function formatHolidayType(type: string) {
  if (type === 'national_holiday') return 'Libur Nasional'
  if (type === 'company_holiday') return 'Libur Perusahaan'
  if (type === 'collective_leave') return 'Cuti Bersama'
  return type
}

function formatSource(source: string) {
  if (source === 'manual') return 'Manual HR'
  if (source === 'government') return 'SKB Pemerintah'
  if (source === 'internal_memo') return 'Internal Memo'
  return source
}

function formatDisplayDate(value: string | null | undefined) {
  if (!value) return '-'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDayName(value: string | null | undefined) {
  if (!value) return '-'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
  })
}
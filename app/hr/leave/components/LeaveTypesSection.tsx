'use client'

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  Search,
  Settings2,
  Plus,
  Pencil,
  Power,
  Save,
  X,
  RefreshCcw,
  BadgeCheck,
  UploadCloud,
  WalletCards,
  CircleDollarSign,
  FileText,
  ShieldCheck,
  Eye,
  Sparkles,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import type { LeaveType } from '@/types/leaveType'

type LeaveTypeForm = {
  name: string
  code: string
  description: string
  default_days: number
  balance_source: string
  is_paid: boolean
  requires_attachment: boolean
  attachment_label: string
  gender_restriction: string
  is_active: boolean
}

const initialForm: LeaveTypeForm = {
  name: '',
  code: '',
  description: '',
  default_days: 0,
  balance_source: 'none',
  is_paid: true,
  requires_attachment: false,
  attachment_label: '',
  gender_restriction: 'all',
  is_active: true,
}

export function LeaveTypesSection() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [search, setSearch] = useState('')
  const [balanceFilter, setBalanceFilter] = useState('all')
  const [attachmentFilter, setAttachmentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingLeaveTypeId, setEditingLeaveTypeId] = useState<string | null>(null)
  const [detailLeaveType, setDetailLeaveType] = useState<LeaveType | null>(null)

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [form, setForm] = useState<LeaveTypeForm>(initialForm)

  async function fetchLeaveTypes() {
    setLoading(true)
    setErrorMessage('')

    const { data, error } = await supabase
      .from('leave_types')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      setErrorMessage(error.message)
      setLeaveTypes([])
      setLoading(false)
      return
    }

    setLeaveTypes(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchLeaveTypes()
  }, [])

  function updateForm(
    field: keyof LeaveTypeForm,
    value: string | number | boolean
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  function normalizeCode(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  }

  function handleNameChange(value: string) {
    setForm((prev) => ({
      ...prev,
      name: value,
      code: editingLeaveTypeId ? prev.code : normalizeCode(value),
    }))
  }

  function resetForm() {
    setForm(initialForm)
    setEditingLeaveTypeId(null)
    setShowFormModal(false)
    setErrorMessage('')
  }

  function handleAddNew() {
    setForm(initialForm)
    setEditingLeaveTypeId(null)
    setDetailLeaveType(null)
    setShowFormModal(true)
    setSuccessMessage('')
    setErrorMessage('')
  }

  function handleEdit(leaveType: LeaveType) {
    setEditingLeaveTypeId(leaveType.id)

    setForm({
      name: leaveType.name || '',
      code: leaveType.code || '',
      description: leaveType.description || '',
      default_days: Number(leaveType.default_days || 0),
      balance_source: leaveType.balance_source || 'none',
      is_paid: leaveType.is_paid ?? true,
      requires_attachment: leaveType.requires_attachment ?? false,
      attachment_label: leaveType.attachment_label || '',
      gender_restriction: leaveType.gender_restriction || 'all',
      is_active: leaveType.is_active ?? true,
    })

    setDetailLeaveType(null)
    setShowFormModal(true)
    setSuccessMessage('')
    setErrorMessage('')
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    if (!form.name || !form.code) {
      setErrorMessage('Nama jenis cuti dan kode wajib diisi.')
      setSaving(false)
      return
    }

    const payload = {
      name: form.name,
      code: normalizeCode(form.code),
      description: form.description || null,
      default_days: form.default_days,
      balance_source: form.balance_source,
      is_paid: form.is_paid,
      requires_attachment: form.requires_attachment,
      attachment_label: form.requires_attachment
        ? form.attachment_label || 'Upload dokumen pendukung'
        : form.attachment_label || null,
      gender_restriction: form.gender_restriction,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    }

    if (editingLeaveTypeId) {
      const { error } = await supabase
        .from('leave_types')
        .update(payload)
        .eq('id', editingLeaveTypeId)

      if (error) {
        setErrorMessage(error.message)
        setSaving(false)
        return
      }

      setSuccessMessage('Jenis cuti berhasil diperbarui.')
    } else {
      const { error } = await supabase
        .from('leave_types')
        .insert(payload)

      if (error) {
        setErrorMessage(error.message)
        setSaving(false)
        return
      }

      setSuccessMessage('Jenis cuti berhasil ditambahkan.')
    }

    setForm(initialForm)
    setEditingLeaveTypeId(null)
    setShowFormModal(false)
    setSaving(false)

    await fetchLeaveTypes()
  }

  async function handleToggleActive(leaveType: LeaveType) {
    const nextStatus = !leaveType.is_active

    setErrorMessage('')
    setSuccessMessage('')

    const { error } = await supabase
      .from('leave_types')
      .update({
        is_active: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leaveType.id)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setSuccessMessage(
      nextStatus
        ? 'Jenis cuti berhasil diaktifkan kembali.'
        : 'Jenis cuti berhasil dinonaktifkan.'
    )

    setDetailLeaveType(null)
    await fetchLeaveTypes()
  }

  const filteredLeaveTypes = useMemo(() => {
    const keyword = search.toLowerCase().trim()

    return leaveTypes.filter((item) => {
      const matchesKeyword =
        !keyword ||
        item.name?.toLowerCase().includes(keyword) ||
        item.code?.toLowerCase().includes(keyword) ||
        item.description?.toLowerCase().includes(keyword) ||
        item.balance_source?.toLowerCase().includes(keyword) ||
        item.attachment_label?.toLowerCase().includes(keyword) ||
        item.gender_restriction?.toLowerCase().includes(keyword)

      const matchesBalance =
        balanceFilter === 'all' ||
        item.balance_source === balanceFilter

      const matchesAttachment =
        attachmentFilter === 'all' ||
        (attachmentFilter === 'required' && item.requires_attachment) ||
        (attachmentFilter === 'not_required' && !item.requires_attachment)

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && item.is_active) ||
        (statusFilter === 'inactive' && !item.is_active)

      return (
        matchesKeyword &&
        matchesBalance &&
        matchesAttachment &&
        matchesStatus
      )
    })
  }, [leaveTypes, search, balanceFilter, attachmentFilter, statusFilter])

  const totalTypes = leaveTypes.length
  const activeTypes = leaveTypes.filter((item) => item.is_active).length

  const attachmentRequired = leaveTypes.filter(
    (item) => item.requires_attachment
  ).length

  const balanceBased = leaveTypes.filter(
    (item) => item.balance_source && item.balance_source !== 'none'
  ).length

  const paidTypes = leaveTypes.filter((item) => item.is_paid).length

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Total Jenis"
          value={String(totalTypes)}
          description="Master leave type"
          icon={<Settings2 size={20} />}
          tone="blue"
        />

        <SummaryCard
          title="Aktif"
          value={String(activeTypes)}
          description="Bisa dipilih"
          icon={<BadgeCheck size={20} />}
          tone="green"
        />

        <SummaryCard
          title="Wajib Bukti"
          value={String(attachmentRequired)}
          description="Perlu dokumen"
          icon={<UploadCloud size={20} />}
          tone="orange"
        />

        <SummaryCard
          title="Potong Saldo"
          value={String(balanceBased)}
          description="Cuti / PHL"
          icon={<WalletCards size={20} />}
          tone="purple"
        />

        <SummaryCard
          title="Paid"
          value={String(paidTypes)}
          description="Berbayar"
          icon={<CircleDollarSign size={20} />}
          tone="cyan"
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

      {showFormModal && (
        <LeaveTypeFormModal
          form={form}
          saving={saving}
          editingLeaveTypeId={editingLeaveTypeId}
          onClose={resetForm}
          onSubmit={handleSubmit}
          onUpdate={updateForm}
          onNameChange={handleNameChange}
          normalizeCode={normalizeCode}
        />
      )}

      {detailLeaveType && (
        <LeaveTypeDetailModal
          leaveType={detailLeaveType}
          onClose={() => setDetailLeaveType(null)}
          onEdit={() => handleEdit(detailLeaveType)}
          onToggleActive={() => handleToggleActive(detailLeaveType)}
        />
      )}

      <div className="harmony-card harmony-slide-up overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-black/5 bg-white/55 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1.5 text-xs font-bold text-[#0059b8]">
              <Settings2 size={14} />
              Master Leave Type
            </div>

            <h2 className="text-lg font-semibold text-[#1d1d1f]">
              Master Jenis Cuti
            </h2>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#6e6e73]">
              Semua jenis cuti di halaman ini bisa diedit HR dan otomatis muncul di form pengajuan.
              Keterangan dibuat proporsional agar aturan cuti tetap terbaca jelas.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <button
              type="button"
              onClick={fetchLeaveTypes}
              className="harmony-button-secondary"
            >
              <RefreshCcw size={18} />
              Refresh
            </button>

            <button
              type="button"
              onClick={handleAddNew}
              className="harmony-button-primary"
            >
              <Plus size={18} />
              Tambah Jenis
            </button>
          </div>
        </div>

        <div className="grid gap-3 border-b border-black/5 bg-white/35 p-5 xl:grid-cols-[1fr_210px_210px_190px]">
          <div className="flex min-h-11 items-center gap-3 rounded-2xl border border-black/5 bg-[#f5f5f7]/85 px-4 shadow-sm transition focus-within:border-[#007aff]/40 focus-within:bg-white focus-within:shadow-md">
            <Search size={18} className="text-[#6e6e73]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, kode, keterangan, saldo, label bukti..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-[#86868b]"
            />
          </div>

          <select
            value={balanceFilter}
            onChange={(event) => setBalanceFilter(event.target.value)}
            className="harmony-select"
          >
            <option value="all">Semua Saldo</option>
            <option value="none">Tidak Potong Saldo</option>
            <option value="annual_leave">Cuti Tahunan</option>
            <option value="phl">Saldo PHL</option>
          </select>

          <select
            value={attachmentFilter}
            onChange={(event) => setAttachmentFilter(event.target.value)}
            className="harmony-select"
          >
            <option value="all">Semua Bukti</option>
            <option value="required">Wajib Bukti</option>
            <option value="not_required">Tidak Wajib</option>
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
        </div>

        {loading && (
          <div className="p-6 text-sm text-[#6e6e73]">
            Memuat data jenis cuti...
          </div>
        )}

        {!loading && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1220px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-black/5 bg-[#f5f5f7]/90 text-xs uppercase tracking-wide text-[#6e6e73]">
                  <th className="w-[22%] px-5 py-4 font-semibold">Jenis Cuti</th>
                  <th className="w-[31%] px-5 py-4 font-semibold">Keterangan</th>
                  <th className="w-[10%] px-5 py-4 font-semibold">Default</th>
                  <th className="w-[14%] px-5 py-4 font-semibold">Saldo</th>
                  <th className="w-[10%] px-5 py-4 font-semibold">Bukti</th>
                  <th className="w-[7%] px-5 py-4 font-semibold">Status</th>
                  <th className="w-[6%] px-5 py-4 text-center font-semibold">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredLeaveTypes.map((leaveType) => (
                  <tr
                    key={leaveType.id}
                    className="border-b border-black/5 align-top transition hover:bg-white/55"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1d1d1f] text-xs font-bold text-white shadow-sm">
                          {getInitials(leaveType.name || '-')}
                        </div>

                        <div className="min-w-0">
                          <div className="font-semibold leading-5 text-[#1d1d1f]">
                            {leaveType.name || '-'}
                          </div>

                          <div className="mt-1 inline-flex rounded-full bg-[#f5f5f7] px-3 py-1 text-xs font-bold text-[#6e6e73]">
                            {leaveType.code || '-'}
                          </div>

                          <div className="mt-2 text-xs text-[#86868b]">
                            {formatGenderRestriction(leaveType.gender_restriction)}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="max-w-[420px] rounded-[20px] border border-black/5 bg-white/70 p-4 shadow-sm">
                        <p className="line-clamp-3 text-sm leading-6 text-[#1d1d1f]">
                          {leaveType.description || 'Belum ada keterangan khusus untuk jenis cuti ini.'}
                        </p>

                        {leaveType.attachment_label && (
                          <div className="mt-3 inline-flex rounded-full bg-[#e8f2ff] px-3 py-1 text-xs font-bold text-[#0059b8]">
                            {leaveType.attachment_label}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="inline-flex min-w-16 justify-center rounded-full bg-[#e8f2ff] px-3 py-1 text-xs font-bold text-[#0059b8]">
                        {Number(leaveType.default_days || 0)} hari
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="space-y-2">
                        <BalanceBadge source={leaveType.balance_source || 'none'} />
                        <PaidBadge paid={leaveType.is_paid ?? true} />
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <AttachmentBadge required={leaveType.requires_attachment ?? false} />
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge active={leaveType.is_active ?? false} />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <ActionButton
                          title="Detail"
                          icon={<Eye size={15} />}
                          tone="blue"
                          onClick={() => setDetailLeaveType(leaveType)}
                        />

                        <ActionButton
                          title="Edit"
                          icon={<Pencil size={15} />}
                          tone="neutral"
                          onClick={() => handleEdit(leaveType)}
                        />

                        <ActionButton
                          title={
                            leaveType.is_active
                              ? 'Nonaktifkan'
                              : 'Aktifkan'
                          }
                          icon={<Power size={15} />}
                          tone={leaveType.is_active ? 'red' : 'green'}
                          onClick={() => handleToggleActive(leaveType)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredLeaveTypes.length === 0 && (
              <EmptyState
                title="Data jenis cuti tidak ditemukan"
                description="Coba ubah filter pencarian atau tambahkan jenis cuti baru."
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function LeaveTypeFormModal({
  form,
  saving,
  editingLeaveTypeId,
  onClose,
  onSubmit,
  onUpdate,
  onNameChange,
  normalizeCode,
}: {
  form: LeaveTypeForm
  saving: boolean
  editingLeaveTypeId: string | null
  onClose: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onUpdate: (field: keyof LeaveTypeForm, value: string | number | boolean) => void
  onNameChange: (value: string) => void
  normalizeCode: (value: string) => string
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[34px] border border-white/20 bg-white/95 shadow-[0_30px_90px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
        <div className="flex flex-col gap-4 border-b border-black/5 bg-white/70 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1.5 text-xs font-bold text-[#0059b8]">
              <Sparkles size={14} />
              Leave Type Configuration
            </div>

            <h2 className="text-xl font-semibold text-[#1d1d1f]">
              {editingLeaveTypeId ? 'Edit Jenis Cuti' : 'Tambah Jenis Cuti'}
            </h2>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#6e6e73]">
              Form dibuat dalam modal agar halaman utama tetap bersih, simetris,
              dan tidak perlu scroll manual untuk mengedit data.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f5f5f7] text-[#1d1d1f] transition hover:bg-white"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="max-h-[calc(92vh-98px)] overflow-y-auto bg-white/35 p-6"
        >
          <div className="grid gap-5 xl:grid-cols-[1fr_0.92fr]">
            <div className="rounded-[28px] border border-black/5 bg-white/70 p-5 shadow-sm">
              <div className="mb-5 flex items-start gap-3">
                <div className="rounded-2xl bg-[#e8f2ff] p-3 text-[#007aff]">
                  <FileText size={18} />
                </div>

                <div>
                  <h3 className="font-semibold text-[#1d1d1f]">
                    Identitas Jenis Cuti
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                    Nama, kode sistem, jumlah hari default, dan keterangan utama.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <InputField
                  label="Nama Jenis Cuti"
                  value={form.name}
                  onChange={onNameChange}
                  placeholder="Contoh: Cuti Menikah"
                  required
                />

                <InputField
                  label="Kode Sistem"
                  value={form.code}
                  onChange={(value) => onUpdate('code', normalizeCode(value))}
                  placeholder="contoh: marriage_leave"
                  required
                />

                <InputField
                  label="Default Days"
                  type="number"
                  value={String(form.default_days)}
                  onChange={(value) => onUpdate('default_days', Number(value))}
                />

                <SelectField
                  label="Status Data"
                  value={form.is_active ? 'active' : 'inactive'}
                  onChange={(value) => onUpdate('is_active', value === 'active')}
                  options={[
                    { label: 'Active', value: 'active' },
                    { label: 'Inactive', value: 'inactive' },
                  ]}
                />

                <TextAreaField
                  label="Keterangan / Deskripsi"
                  value={form.description}
                  onChange={(value) => onUpdate('description', value)}
                  placeholder="Contoh: Cuti khusus untuk karyawan yang melangsungkan pernikahan sesuai ketentuan perusahaan."
                  className="md:col-span-2"
                />
              </div>
            </div>

            <div className="rounded-[28px] border border-black/5 bg-white/70 p-5 shadow-sm">
              <div className="mb-5 flex items-start gap-3">
                <div className="rounded-2xl bg-[#f7edfc] p-3 text-[#7b2cbf]">
                  <ShieldCheck size={18} />
                </div>

                <div>
                  <h3 className="font-semibold text-[#1d1d1f]">
                    Aturan Pemakaian
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                    Saldo, paid/unpaid, bukti pendukung, dan gender restriction.
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                <SelectField
                  label="Potong Saldo"
                  value={form.balance_source}
                  onChange={(value) => onUpdate('balance_source', value)}
                  options={[
                    { label: 'Tidak Potong Saldo', value: 'none' },
                    { label: 'Potong Cuti Tahunan', value: 'annual_leave' },
                    { label: 'Potong Saldo PHL', value: 'phl' },
                  ]}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    label="Paid / Unpaid"
                    value={form.is_paid ? 'paid' : 'unpaid'}
                    onChange={(value) => onUpdate('is_paid', value === 'paid')}
                    options={[
                      { label: 'Paid', value: 'paid' },
                      { label: 'Unpaid', value: 'unpaid' },
                    ]}
                  />

                  <SelectField
                    label="Wajib Upload Bukti"
                    value={form.requires_attachment ? 'yes' : 'no'}
                    onChange={(value) =>
                      onUpdate('requires_attachment', value === 'yes')
                    }
                    options={[
                      { label: 'Ya, wajib upload', value: 'yes' },
                      { label: 'Tidak wajib', value: 'no' },
                    ]}
                  />
                </div>

                <InputField
                  label="Label Bukti"
                  value={form.attachment_label}
                  onChange={(value) => onUpdate('attachment_label', value)}
                  placeholder="Contoh: Upload surat dokter"
                />

                <SelectField
                  label="Gender Restriction"
                  value={form.gender_restriction}
                  onChange={(value) => onUpdate('gender_restriction', value)}
                  options={[
                    { label: 'Semua', value: 'all' },
                    { label: 'Laki-laki', value: 'male' },
                    { label: 'Perempuan', value: 'female' },
                  ]}
                />

                <div className="rounded-[24px] border border-black/5 bg-[#f5f5f7]/80 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#6e6e73]">
                    Preview Rule
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <BalanceBadge source={form.balance_source} />
                    <PaidBadge paid={form.is_paid} />
                    <AttachmentBadge required={form.requires_attachment} />
                    <StatusBadge active={form.is_active} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 mt-6 flex flex-col gap-3 border-t border-black/5 bg-white/90 pt-5 backdrop-blur-xl md:flex-row md:justify-end">
            <button
              type="button"
              onClick={onClose}
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
                : editingLeaveTypeId
                  ? 'Update Data'
                  : 'Simpan Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function LeaveTypeDetailModal({
  leaveType,
  onClose,
  onEdit,
  onToggleActive,
}: {
  leaveType: LeaveType
  onClose: () => void
  onEdit: () => void
  onToggleActive: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-5 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-[32px] border border-white/20 bg-white/95 shadow-[0_30px_90px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-black/5 bg-white/70 p-6">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1.5 text-xs font-bold text-[#0059b8]">
              <Eye size={14} />
              Detail Jenis Cuti
            </div>

            <h2 className="text-xl font-semibold text-[#1d1d1f]">
              {leaveType.name || '-'}
            </h2>

            <p className="mt-1 text-sm text-[#6e6e73]">
              {leaveType.code || '-'} · {formatBalanceSource(leaveType.balance_source)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f5f5f7] text-[#1d1d1f] transition hover:bg-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[62vh] overflow-y-auto p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DetailCard
              label="Default Days"
              value={`${Number(leaveType.default_days || 0)} hari`}
              subValue="Jumlah hari otomatis"
              icon={<FileText size={18} />}
            />

            <DetailCard
              label="Potong Saldo"
              value={formatBalanceSource(leaveType.balance_source)}
              subValue={leaveType.balance_source || 'none'}
              icon={<WalletCards size={18} />}
            />

            <DetailCard
              label="Paid / Unpaid"
              value={leaveType.is_paid ? 'Paid' : 'Unpaid'}
              subValue="Status pembayaran"
              icon={<CircleDollarSign size={18} />}
            />

            <DetailCard
              label="Upload Bukti"
              value={leaveType.requires_attachment ? 'Wajib' : 'Tidak Wajib'}
              subValue={leaveType.attachment_label || 'Tidak ada label bukti'}
              icon={<UploadCloud size={18} />}
            />

            <DetailCard
              label="Gender"
              value={formatGenderRestriction(leaveType.gender_restriction)}
              subValue="Pembatasan pengguna"
              icon={<ShieldCheck size={18} />}
            />

            <DetailCard
              label="Status"
              value={leaveType.is_active ? 'Active' : 'Inactive'}
              subValue="Status master data"
              icon={<BadgeCheck size={18} />}
            />
          </div>

          <div className="mt-5 rounded-[28px] border border-black/5 bg-[#f5f5f7]/70 p-5">
            <h3 className="mb-3 font-semibold text-[#1d1d1f]">
              Keterangan Lengkap
            </h3>

            <p className="whitespace-pre-line text-sm leading-7 text-[#6e6e73]">
              {leaveType.description || 'Belum ada keterangan khusus untuk jenis cuti ini.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-black/5 bg-white/70 p-5 md:flex-row md:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="harmony-button-secondary"
          >
            Tutup
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="harmony-button-secondary"
          >
            <Pencil size={18} />
            Edit
          </button>

          <button
            type="button"
            onClick={onToggleActive}
            className={[
              'inline-flex min-h-11 items-center justify-center gap-2 rounded-[18px] px-5 text-sm font-bold transition hover:-translate-y-0.5',
              leaveType.is_active
                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                : 'bg-green-50 text-green-700 hover:bg-green-100',
            ].join(' ')}
          >
            <Power size={18} />
            {leaveType.is_active ? 'Nonaktifkan' : 'Aktifkan'}
          </button>
        </div>
      </div>
    </div>
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
  icon: ReactNode
  tone: 'blue' | 'green' | 'orange' | 'purple' | 'cyan'
}) {
  const toneClass = {
    blue: 'text-[#007aff] bg-[#e8f2ff]',
    green: 'text-[#168034] bg-[#eaf8ee]',
    orange: 'text-[#b35b00] bg-[#fff4e5]',
    purple: 'text-[#7b2cbf] bg-[#f7edfc]',
    cyan: 'text-[#0077a3] bg-[#e8f8ff]',
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

function DetailCard({
  label,
  value,
  subValue,
  icon,
}: {
  label: string
  value: string
  subValue: string
  icon: ReactNode
}) {
  return (
    <div className="rounded-[24px] border border-black/5 bg-white/70 p-4 shadow-sm">
      <div className="mb-4 inline-flex rounded-2xl bg-[#e8f2ff] p-3 text-[#007aff]">
        {icon}
      </div>

      <p className="text-xs font-bold uppercase tracking-wide text-[#6e6e73]">
        {label}
      </p>

      <p className="mt-2 font-semibold text-[#1d1d1f]">
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-[#6e6e73]">
        {subValue}
      </p>
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

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  className = '',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="harmony-label">
        {label}
      </span>

      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="harmony-textarea min-h-32"
      />
    </label>
  )
}

function BalanceBadge({
  source,
}: {
  source: string
}) {
  const className =
    source === 'annual_leave'
      ? 'bg-[#e8f2ff] text-[#0059b8]'
      : source === 'phl'
        ? 'bg-[#f7edfc] text-[#7b2cbf]'
        : 'bg-[#f5f5f7] text-[#6e6e73]'

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${className}`}>
      {formatBalanceSource(source)}
    </span>
  )
}

function PaidBadge({
  paid,
}: {
  paid: boolean
}) {
  return (
    <span
      className={[
        'inline-flex rounded-full px-3 py-1 text-xs font-bold',
        paid
          ? 'bg-green-50 text-green-700'
          : 'bg-red-50 text-red-700',
      ].join(' ')}
    >
      {paid ? 'Paid' : 'Unpaid'}
    </span>
  )
}

function AttachmentBadge({
  required,
}: {
  required: boolean
}) {
  return (
    <span
      className={[
        'inline-flex rounded-full px-3 py-1 text-xs font-bold',
        required
          ? 'bg-orange-50 text-orange-700'
          : 'bg-[#f5f5f7] text-[#6e6e73]',
      ].join(' ')}
    >
      {required ? 'Wajib' : 'Opsional'}
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

function ActionButton({
  title,
  icon,
  tone,
  onClick,
}: {
  title: string
  icon: ReactNode
  tone: 'blue' | 'neutral' | 'red' | 'green'
  onClick: () => void
}) {
  const className = {
    blue: 'border border-black/5 bg-white text-[#007aff] hover:bg-[#f5f5f7]',
    neutral: 'border border-black/5 bg-white text-[#1d1d1f] hover:bg-[#f5f5f7]',
    red: 'bg-red-50 text-red-700 hover:bg-red-100',
    green: 'bg-green-50 text-green-700 hover:bg-green-100',
  }[tone]

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-2xl shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${className}`}
    >
      {icon}
    </button>
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

function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#f5f5f7] text-[#007aff]">
        <Settings2 size={24} />
      </div>

      <h3 className="mt-4 font-semibold text-[#1d1d1f]">
        {title}
      </h3>

      <p className="mt-1 text-sm text-[#6e6e73]">
        {description}
      </p>
    </div>
  )
}

function formatBalanceSource(value: string | null | undefined) {
  if (value === 'annual_leave') return 'Cuti Tahunan'
  if (value === 'phl') return 'Saldo PHL'
  if (value === 'none') return 'Tidak Potong Saldo'

  return value || 'Tidak Potong Saldo'
}

function formatGenderRestriction(value: string | null | undefined) {
  if (value === 'male') return 'Khusus Laki-laki'
  if (value === 'female') return 'Khusus Perempuan'
  if (value === 'all') return 'Berlaku untuk semua'

  return value || 'Berlaku untuk semua'
}

function getInitials(name: string) {
  const words = name.trim().split(' ').filter(Boolean)

  if (words.length === 0) return 'JC'

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}
'use client'

import { useMemo, useState } from 'react'
import { Loader2, Search, Trash2 } from 'lucide-react'
import { formatRemedDate, formatRupiah, REMED_STATUS_LABELS } from '@/lib/remed'
import { remedFetch } from '@/lib/remed-client'
import type { RemedClaimStatus, RemedProcessHistory } from '@/types/remed'

function statusLabel(value: string | null | undefined) {
  if (!value) return 'Dibuat'
  if (value === 'deleted') return 'Dihapus'
  return REMED_STATUS_LABELS[value as RemedClaimStatus] || value.replaceAll('_', ' ')
}

function actorLabel(value: string | null | undefined) {
  const actor = String(value || '').toLowerCase()
  if (actor === 'hr') return 'HR'
  if (actor === 'finance') return 'Finance'
  if (actor === 'employee') return 'Employee'
  if (actor === 'system') return 'System'
  return value || '-'
}

export function RemedProcessHistory({
  history,
  allowDelete = false,
  onDeleted,
}: {
  history: RemedProcessHistory[]
  allowDelete?: boolean
  onDeleted?: () => void | Promise<void>
}) {
  const [query, setQuery] = useState('')
  const [deletingClaimId, setDeletingClaimId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return history
    return history.filter((item) => [
      item.claim_number,
      item.employee_name,
      item.claim_type_name,
      item.actor_role,
      item.actor_email,
      item.note,
      item.from_status,
      item.to_status,
    ].some((value) => String(value || '').toLowerCase().includes(q)))
  }, [history, query])

  async function purgeDeletedClaim(item: RemedProcessHistory) {
    if (!item.claim_id || !item.is_deleted || item.to_status !== 'deleted') return

    const reason = window.prompt(
      `Hapus seluruh riwayat klaim ${item.claim_number || item.claim_id}?\n\nSemua jejak approval/reject yang sudah diarsipkan untuk klaim ini akan dihapus permanen. Masukkan alasan pembersihan:`,
      '',
    )
    if (reason === null) return
    if (!reason.trim()) {
      window.alert('Alasan penghapusan riwayat wajib diisi.')
      return
    }

    const confirmed = window.confirm(
      `Konfirmasi hapus permanen seluruh riwayat ${item.claim_number || item.claim_id}.\n\nAksi ini hanya untuk klaim yang SUDAH DIHAPUS dan tidak mengubah saldo/plafond lagi. Lanjutkan?`,
    )
    if (!confirmed) return

    setDeletingClaimId(item.claim_id)
    try {
      const result = await remedFetch<{ success: boolean; warning?: string | null }>(`/api/remed/history/${item.claim_id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason: reason.trim() }),
      })
      if (result.warning) window.alert(result.warning)
      await onDeleted?.()
    } catch (error: any) {
      window.alert(error?.message || 'Gagal menghapus riwayat klaim.')
    } finally {
      setDeletingClaimId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-[24px] border border-black/5 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#1d1d1f]">Seluruh Riwayat Approval & Reject</p>
          <p className="mt-1 text-xs text-[#6e6e73]">Menampilkan perubahan status, alasan, aktor, dan waktu proses Re-Med.</p>
          {allowDelete ? (
            <p className="mt-1 text-[11px] text-[#8e8e93]">Hapus riwayat hanya tersedia untuk klaim yang sudah dihapus dari data operasional.</p>
          ) : null}
        </div>
        <label className="flex min-w-0 items-center gap-2 rounded-2xl border border-black/10 bg-[#f5f5f7] px-3 py-2 sm:w-[360px]">
          <Search size={16} className="shrink-0 text-[#8e8e93]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari klaim, nama, alasan, aktor..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
      </div>

      {!filtered.length ? (
        <div className="rounded-[26px] border border-dashed border-black/10 bg-white/70 p-8 text-center text-sm text-[#6e6e73]">Belum ada riwayat proses.</div>
      ) : (
        <div className="overflow-hidden rounded-[26px] border border-black/5 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1240px] w-full text-left text-sm">
              <thead className="bg-[#f5f5f7] text-xs uppercase tracking-wide text-[#6e6e73]">
                <tr>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Klaim / Karyawan</th>
                  <th className="px-4 py-3">Jenis</th>
                  <th className="px-4 py-3">Perubahan Status</th>
                  <th className="px-4 py-3">Diproses Oleh</th>
                  <th className="px-4 py-3">Alasan / Catatan</th>
                  <th className="px-4 py-3 text-right">Nominal</th>
                  {allowDelete ? <th className="px-4 py-3 text-right">Aksi</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map((item) => {
                  const canPurge = allowDelete && item.is_deleted && item.to_status === 'deleted' && Boolean(item.claim_id)
                  const deleting = deletingClaimId === item.claim_id
                  return (
                    <tr key={item.event_id} className="align-top hover:bg-[#fbfbfc]">
                      <td className="whitespace-nowrap px-4 py-4 text-[#6e6e73]">
                        <p className="font-medium text-[#1d1d1f]">{formatRemedDate(item.event_at)}</p>
                        <p className="mt-1 text-xs">{new Date(item.event_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-[#1d1d1f]">{item.claim_number || '-'}</p>
                        <p className="mt-1 text-xs text-[#6e6e73]">{item.employee_name || '-'}</p>
                      </td>
                      <td className="px-4 py-4 text-[#5d5d61]">
                        <p>{item.claim_type_name || '-'}</p>
                        <p className="mt-1 text-xs">{formatRemedDate(item.treatment_date)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {item.from_status ? <span className="rounded-full bg-[#f5f5f7] px-2.5 py-1 text-xs font-semibold text-[#5d5d61]">{statusLabel(item.from_status)}</span> : null}
                          <span className="text-[#8e8e93]">→</span>
                          <span className={[
                            'rounded-full px-2.5 py-1 text-xs font-semibold',
                            item.to_status.includes('rejected') || item.to_status === 'deleted'
                              ? 'bg-red-50 text-red-700'
                              : item.to_status === 'paid'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-blue-50 text-blue-700',
                          ].join(' ')}>{statusLabel(item.to_status)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-[#1d1d1f]">{actorLabel(item.actor_role)}</p>
                        <p className="mt-1 max-w-[220px] break-all text-xs text-[#6e6e73]">{item.actor_email || '-'}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className={item.note ? 'max-w-[320px] whitespace-pre-wrap text-[#1d1d1f]' : 'text-[#8e8e93]'}>{item.note || 'Tidak ada catatan.'}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right">
                        <p className="font-semibold text-[#1d1d1f]">{formatRupiah(item.approved_amount || item.submitted_amount || 0)}</p>
                        {item.approved_amount && item.submitted_amount && Number(item.approved_amount) !== Number(item.submitted_amount) ? (
                          <p className="mt-1 text-xs text-[#6e6e73]">Diajukan {formatRupiah(item.submitted_amount)}</p>
                        ) : null}
                      </td>
                      {allowDelete ? (
                        <td className="whitespace-nowrap px-4 py-4 text-right">
                          {canPurge ? (
                            <button
                              type="button"
                              onClick={() => purgeDeletedClaim(item)}
                              disabled={deleting}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                              {deleting ? 'Menghapus...' : 'Hapus Riwayat'}
                            </button>
                          ) : (
                            <span className="text-xs text-[#b0b0b5]">—</span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

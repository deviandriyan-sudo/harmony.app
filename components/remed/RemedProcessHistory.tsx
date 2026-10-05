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
    <div className="harmony-unified-surface">
      <div className="flex flex-col gap-4 border-b border-black/[0.055] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <p className="harmony-section-title">Seluruh Riwayat Approval & Reject</p>
          <p className="harmony-section-copy">Perubahan status, alasan, aktor, waktu proses, dan nominal Re-Med dalam satu riwayat.</p>
          {allowDelete ? <p className="mt-1 text-[11px] text-[#92969d]">Pembersihan permanen hanya tersedia untuk klaim yang sudah dihapus dari data operasional.</p> : null}
        </div>
        <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-[16px] border border-black/[0.07] bg-[#f6f7f9] px-3.5 sm:w-[360px]">
          <Search size={16} className="shrink-0 text-[#8a8f98]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari klaim, nama, alasan, aktor..."
            className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none shadow-none"
          />
        </label>
      </div>

      {!filtered.length ? (
        <div className="m-5 rounded-[22px] border border-dashed border-black/10 bg-[#f8f9fb] p-9 text-center text-sm text-[#747982]">Belum ada riwayat proses.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[1240px] w-full text-left text-sm">
            <thead className="bg-[#f6f7f9] text-[11px] font-bold uppercase tracking-[0.08em] text-[#777c85]">
              <tr>
                <th className="px-5 py-3.5">Waktu</th>
                <th className="px-5 py-3.5">Klaim / Karyawan</th>
                <th className="px-5 py-3.5">Jenis</th>
                <th className="px-5 py-3.5">Perubahan Status</th>
                <th className="px-5 py-3.5">Diproses Oleh</th>
                <th className="px-5 py-3.5">Alasan / Catatan</th>
                <th className="px-5 py-3.5 text-right">Nominal</th>
                {allowDelete ? <th className="px-5 py-3.5 text-right">Aksi</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.055]">
              {filtered.map((item) => {
                const canPurge = allowDelete && item.is_deleted && item.to_status === 'deleted' && Boolean(item.claim_id)
                const deleting = deletingClaimId === item.claim_id
                return (
                  <tr key={item.event_id} className="align-top transition hover:bg-[#fafbfc]">
                    <td className="whitespace-nowrap px-5 py-4 text-[#747982]">
                      <p className="font-semibold text-[#25272c]">{formatRemedDate(item.event_at)}</p>
                      <p className="mt-1 text-xs">{new Date(item.event_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-[#17181b]">{item.claim_number || '-'}</p>
                      <p className="mt-1 text-xs text-[#747982]">{item.employee_name || '-'}</p>
                    </td>
                    <td className="px-5 py-4 text-[#5f646c]">
                      <p>{item.claim_type_name || '-'}</p>
                      <p className="mt-1 text-xs text-[#8a8f98]">{formatRemedDate(item.treatment_date)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.from_status ? <span className="rounded-full bg-[#eef0f3] px-2.5 py-1 text-xs font-bold text-[#5f646c]">{statusLabel(item.from_status)}</span> : null}
                        <span className="text-[#a0a4ab]">→</span>
                        <span className={[
                          'rounded-full px-2.5 py-1 text-xs font-bold',
                          item.to_status.includes('rejected') || item.to_status === 'deleted'
                            ? 'bg-red-50 text-red-700'
                            : item.to_status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-blue-50 text-blue-700',
                        ].join(' ')}>{statusLabel(item.to_status)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-[#25272c]">{actorLabel(item.actor_role)}</p>
                      <p className="mt-1 max-w-[220px] break-all text-xs text-[#747982]">{item.actor_email || '-'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className={item.note ? 'max-w-[320px] whitespace-pre-wrap text-[#25272c]' : 'text-[#9da1a8]'}>{item.note || 'Tidak ada catatan.'}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <p className="font-bold text-[#17181b]">{formatRupiah(item.approved_amount || item.submitted_amount || 0)}</p>
                      {item.approved_amount && item.submitted_amount && Number(item.approved_amount) !== Number(item.submitted_amount) ? (
                        <p className="mt-1 text-xs text-[#747982]">Diajukan {formatRupiah(item.submitted_amount)}</p>
                      ) : null}
                    </td>
                    {allowDelete ? (
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        {canPurge ? (
                          <button
                            type="button"
                            onClick={() => purgeDeletedClaim(item)}
                            disabled={deleting}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-[13px] border border-red-100 bg-red-50 px-3 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            {deleting ? 'Menghapus...' : 'Hapus Riwayat'}
                          </button>
                        ) : <span className="text-xs text-[#b0b4ba]">—</span>}
                      </td>
                    ) : null}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

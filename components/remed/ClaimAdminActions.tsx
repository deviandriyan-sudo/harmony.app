'use client'


import { readErrorMessage } from '@/lib/error-utils'
import { Loader2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { remedFetch } from '@/lib/remed-client'
import { RemedPrintLink } from '@/components/remed/RemedPrintLink'
import type { RemedClaim } from '@/types/remed'

export function ClaimAdminActions({
  claim,
  role,
  onDone,
}: {
  claim: RemedClaim
  role: 'hr' | 'finance'
  onDone: () => void
}) {
  const [deleting, setDeleting] = useState(false)

  async function deleteClaim() {
    const reason = window.prompt(
      `Hapus klaim ${claim.claim_number}?\n\nMasukkan alasan penghapusan. Saldo/plafond akan dikoreksi otomatis sesuai status klaim:`,
      '',
    )
    if (reason === null) return
    if (!reason.trim()) {
      window.alert('Alasan penghapusan wajib diisi.')
      return
    }

    const confirmed = window.confirm(
      `Konfirmasi penghapusan permanen ${claim.claim_number}.\n\nData klaim aktif akan dihapus, tetapi jejak penghapusan tetap dicatat di Riwayat Proses. Lanjutkan?`,
    )
    if (!confirmed) return

    setDeleting(true)
    try {
      const result = await remedFetch<{ success: boolean; warning?: string | null }>(`/api/remed/claims/${claim.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason: reason.trim() }),
      })
      if (result.warning) window.alert(result.warning)
      onDone()
    } catch (error: unknown) {
      window.alert(readErrorMessage(error) || 'Gagal menghapus klaim.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="harmony-action-group justify-end">
      <RemedPrintLink claimId={claim.id} role={role} compact />
      <button
        type="button"
        onClick={deleteClaim}
        disabled={deleting}
        className="harmony-action-danger inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        {deleting ? 'Menghapus...' : 'Hapus'}
      </button>
    </div>
  )
}

'use client'

import { ExternalLink } from 'lucide-react'
import { ClaimStatusBadge } from '@/components/remed/ClaimStatusBadge'
import { formatRemedDate, formatRupiah } from '@/lib/remed'
import { remedFetch } from '@/lib/remed-client'
import type { RemedClaim } from '@/types/remed'

export function RemedClaimList({
  claims,
  showEmployee = false,
  action,
}: {
  claims: RemedClaim[]
  showEmployee?: boolean
  action?: (claim: RemedClaim) => React.ReactNode
}) {
  async function openAttachment(id: string) {
    try {
      const payload = await remedFetch<{ url: string }>(`/api/remed/attachments/${id}`)
      window.open(payload.url, '_blank', 'noopener,noreferrer')
    } catch (error: any) {
      window.alert(error?.message || 'Gagal membuka lampiran.')
    }
  }

  if (!claims.length) {
    return <div className="rounded-[26px] border border-dashed border-black/10 bg-white/70 p-8 text-center text-sm text-[#6e6e73]">Belum ada data klaim.</div>
  }

  return (
    <div className="space-y-3">
      {claims.map((claim) => (
        <article key={claim.id} className="rounded-[26px] border border-black/5 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-[#1d1d1f]">{claim.claim_number}</p>
                <ClaimStatusBadge status={claim.status} />
              </div>
              {showEmployee && (
                <p className="mt-2 text-sm font-semibold text-[#1d1d1f]">{claim.employee?.full_name || '-'}</p>
              )}
              <div className="mt-3 grid gap-2 text-sm text-[#6e6e73] sm:grid-cols-2 lg:grid-cols-4">
                <p><span className="font-medium text-[#1d1d1f]">Jenis:</span> {claim.claim_type?.name || '-'}</p>
                <p><span className="font-medium text-[#1d1d1f]">Tanggal:</span> {formatRemedDate(claim.treatment_date)}</p>
                <p><span className="font-medium text-[#1d1d1f]">Diajukan:</span> {formatRupiah(claim.submitted_amount)}</p>
                <p><span className="font-medium text-[#1d1d1f]">Disetujui:</span> {claim.approved_amount ? formatRupiah(claim.approved_amount) : '-'}</p>
              </div>
              {(claim.provider_name || claim.employee_note) && (
                <div className="mt-3 rounded-2xl bg-[#f5f5f7] p-3 text-sm text-[#5d5d61]">
                  {claim.provider_name && <p><span className="font-semibold">Provider:</span> {claim.provider_name}</p>}
                  {claim.employee_note && <p className="mt-1"><span className="font-semibold">Catatan:</span> {claim.employee_note}</p>}
                </div>
              )}
              {claim.attachments?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {claim.attachments.map((attachment) => (
                    <button key={attachment.id} type="button" onClick={() => openAttachment(attachment.id)} className="inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-[#f5f5f7] px-3 py-1.5 text-xs font-semibold text-[#1d1d1f] hover:bg-white">
                      <ExternalLink size={13} /> {attachment.attachment_kind === 'payment_proof' ? 'Bukti Bayar' : attachment.file_name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {action ? <div className="shrink-0">{action(claim)}</div> : null}
          </div>
        </article>
      ))}
    </div>
  )
}

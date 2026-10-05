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
    return <div className="rounded-[22px] border border-dashed border-black/10 bg-[#f8f9fb] p-9 text-center text-sm text-[#747982]">Belum ada data klaim.</div>
  }

  return (
    <div className="space-y-3">
      {claims.map((claim) => (
        <article key={claim.id} className="rounded-[22px] border border-black/[0.065] bg-white p-4 shadow-[0_7px_22px_rgba(15,23,42,.035)] transition hover:border-black/[0.10] hover:shadow-[0_10px_28px_rgba(15,23,42,.055)] sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold tracking-[-0.01em] text-[#17181b]">{claim.claim_number}</p>
                <ClaimStatusBadge status={claim.status} />
              </div>
              {showEmployee ? <p className="mt-2 text-sm font-bold text-[#25272c]">{claim.employee?.full_name || '-'}</p> : null}

              <div className="mt-3 grid gap-2 rounded-[17px] bg-[#f7f8fa] p-3.5 text-sm text-[#747982] sm:grid-cols-2 lg:grid-cols-4">
                <p><span className="font-semibold text-[#25272c]">Jenis:</span> {claim.claim_type?.name || '-'}</p>
                <p><span className="font-semibold text-[#25272c]">Tanggal:</span> {formatRemedDate(claim.treatment_date)}</p>
                <p><span className="font-semibold text-[#25272c]">Diajukan:</span> {formatRupiah(claim.submitted_amount)}</p>
                <p><span className="font-semibold text-[#25272c]">Disetujui:</span> {claim.approved_amount ? formatRupiah(claim.approved_amount) : '-'}</p>
              </div>

              {(claim.provider_name || claim.employee_note) ? (
                <div className="mt-3 rounded-[17px] border border-black/[0.045] bg-white p-3.5 text-sm text-[#5f646c]">
                  {claim.provider_name ? <p><span className="font-bold text-[#25272c]">Provider:</span> {claim.provider_name}</p> : null}
                  {claim.employee_note ? <p className="mt-1"><span className="font-bold text-[#25272c]">Catatan:</span> {claim.employee_note}</p> : null}
                </div>
              ) : null}

              {claim.attachments?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {claim.attachments.map((attachment) => (
                    <button
                      key={attachment.id}
                      type="button"
                      onClick={() => openAttachment(attachment.id)}
                      className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-black/[0.06] bg-[#f6f7f9] px-3 text-xs font-bold text-[#25272c] transition hover:bg-white"
                    >
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

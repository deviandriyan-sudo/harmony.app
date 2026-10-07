'use client'

import { ExternalLink, ShieldCheck, TrendingDown, WalletCards } from 'lucide-react'
import { ClaimStatusBadge } from '@/components/remed/ClaimStatusBadge'
import { formatRemedDate, formatRupiah } from '@/lib/remed'
import { remedFetch } from '@/lib/remed-client'
import type { RemedClaim } from '@/types/remed'

function claimReservedAmount(claim: RemedClaim) {
  if (claim.status === 'pending_hr') return Number(claim.submitted_amount || 0)
  if (claim.status === 'pending_finance' || claim.status === 'waiting_payment') {
    return Number(claim.approved_amount || claim.submitted_amount || 0)
  }
  return 0
}

function shouldShowBalanceImpact(claim: RemedClaim) {
  return claim.status === 'pending_hr' || claim.status === 'pending_finance'
}

function ClaimBalanceImpact({ claim }: { claim: RemedClaim }) {
  const entitlement = claim.entitlement
  if (!entitlement || !shouldShowBalanceImpact(claim)) return null

  const reservedForThisClaim = claimReservedAmount(claim)
  const availableAfterClaim = Number(entitlement.available_amount || 0)
  const availableBeforeClaim = availableAfterClaim + reservedForThisClaim
  const impactAmount = claim.status === 'pending_hr'
    ? Number(claim.submitted_amount || 0)
    : Number(claim.approved_amount || claim.submitted_amount || 0)
  const isSafe = availableAfterClaim >= 0

  return (
    <div className="mt-3 rounded-[20px] border border-emerald-100/80 bg-[linear-gradient(135deg,rgba(236,253,245,.88),rgba(239,246,255,.82))] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,.9)] backdrop-blur-xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800">
          <WalletCards size={15} /> Dampak Plafond {entitlement.period_year}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${isSafe ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          {isSafe ? 'Saldo Aman' : 'Melebihi Saldo'}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[16px] border border-white/80 bg-white/70 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8a8f98]">Plafond Dasar</p>
          <p className="mt-1 text-sm font-bold text-[#202328]">{formatRupiah(entitlement.plafond_total)}</p>
        </div>
        <div className="rounded-[16px] border border-white/80 bg-white/70 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8a8f98]">Sisa Sebelum Klaim Ini</p>
          <p className="mt-1 text-sm font-bold text-[#202328]">{formatRupiah(availableBeforeClaim)}</p>
        </div>
        <div className="rounded-[16px] border border-amber-100/80 bg-amber-50/85 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-amber-700">{claim.status === 'pending_hr' ? 'Nominal Diajukan' : 'Nominal Disetujui HR'}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-amber-800"><TrendingDown size={14} /> {formatRupiah(impactAmount)}</p>
        </div>
        <div className={`rounded-[16px] border p-3 ${isSafe ? 'border-emerald-100/90 bg-emerald-50/90' : 'border-red-100/90 bg-red-50/90'}`}>
          <p className={`text-[10px] font-bold uppercase tracking-[0.08em] ${isSafe ? 'text-emerald-700' : 'text-red-700'}`}>Sisa Setelah Klaim</p>
          <p className={`mt-1 flex items-center gap-1.5 text-sm font-bold ${isSafe ? 'text-emerald-800' : 'text-red-800'}`}><ShieldCheck size={14} /> {formatRupiah(availableAfterClaim)}</p>
        </div>
      </div>

      {Number(entitlement.balance_adjustment || 0) !== 0 ? (
        <p className="mt-2 text-[11px] text-[#68707a]">Termasuk penyesuaian saldo HR sebesar <span className="font-bold">{formatRupiah(entitlement.balance_adjustment)}</span>.</p>
      ) : null}
    </div>
  )
}

export function RemedClaimList({
  claims,
  showEmployee = false,
  showBalanceImpact = false,
  action,
}: {
  claims: RemedClaim[]
  showEmployee?: boolean
  showBalanceImpact?: boolean
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

              {showBalanceImpact ? <ClaimBalanceImpact claim={claim} /> : null}

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

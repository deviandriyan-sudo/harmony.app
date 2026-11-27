/** Full Indonesian Rupiah amount for UI cards (never compact / thousands-abbreviated). */
export function formatFullRupiah(value: number | string | null | undefined): string {
  if (value == null || String(value).trim() === '') return '—'
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '—'
  return `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(numeric)}`
}

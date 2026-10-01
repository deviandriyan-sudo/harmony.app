import type { RemedClaimStatus, RemedRole } from '@/types/remed'

export const REMED_BUCKET = 'remed-private'
export const REMED_MAX_FILES = 3
export const REMED_MAX_FILE_SIZE = 10 * 1024 * 1024
export const REMED_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
])

export const REMED_STATUS_LABELS: Record<RemedClaimStatus, string> = {
  pending_hr: 'Menunggu HR',
  rejected_hr: 'Ditolak HR',
  pending_finance: 'Menunggu Finance',
  rejected_finance: 'Ditolak Finance',
  waiting_payment: 'Menunggu Pembayaran',
  paid: 'Dibayar',
  cancelled: 'Dibatalkan',
  legacy_record: 'Legacy Record',
}

export const REMED_ROLE_LABELS: Record<RemedRole, string> = {
  employee: 'Employee',
  hr: 'HR Reviewer',
  finance: 'Finance',
}

export function formatRupiah(value: number | string | null | undefined) {
  const amount = Number(value || 0)
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0)
}

export function formatRemedDate(value: string | null | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function normalizeRemedRole(value: unknown): RemedRole | null {
  const role = String(value || '').trim().toLowerCase()
  if (role === 'employee' || role === 'hr' || role === 'finance') return role
  return null
}

export function safeFileName(value: string) {
  const clean = value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return clean || 'file'
}

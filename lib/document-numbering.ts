export type DocumentNumberMode = 'auto' | 'manual'
export type NumberedDocument = {
  document_number?: string | null
  document_number_mode?: DocumentNumberMode | null
}

// Null mode identifies records created before RC3Q; preserve the original reference.
export function isDocumentNumberPending(row: NumberedDocument) {
  return row.document_number_mode != null && !row.document_number?.trim()
}
export function documentNumberLabel(row: NumberedDocument, reference: string) {
  return row.document_number?.trim() || (isDocumentNumberPending(row) ? 'Belum diterbitkan' : reference)
}
export function normalizeManualDocumentNumber(value: unknown) {
  if (typeof value !== 'string') return null
  const number = value.trim()
  if (!/^[A-Za-z0-9][A-Za-z0-9/._-]{0,79}$/.test(number)) return null
  return number.toUpperCase()
}
export function isNumberingModule(value: unknown): value is 'remed' | 'scaleup' {
  return value === 'remed' || value === 'scaleup'
}
export function isDocumentNumberMode(value: unknown): value is DocumentNumberMode {
  return value === 'auto' || value === 'manual'
}

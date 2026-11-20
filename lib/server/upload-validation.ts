/**
 * Shared server-side file signature checks for HARMONY upload endpoints.
 * File.name, File.type and signed-upload metadata are untrusted input.
 * A valid signature is only an initial format check, not malware scanning.
 */
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

export function uploadExtension(fileName: string): string {
  return fileName.split('.').pop()?.trim().toLowerCase() || ''
}

export function uploadExpectedMime(fileName: string): string | null {
  return MIME_BY_EXTENSION[uploadExtension(fileName)] || null
}

export function validUploadSignature(fileName: string, bytes: Uint8Array, declaredMime?: string | null): boolean {
  const extension = uploadExtension(fileName)
  const expected = MIME_BY_EXTENSION[extension]
  if (!expected) return false
  const mime = (declaredMime || '').trim().toLowerCase()
  // Browsers sometimes omit MIME for legacy Office documents. Do not trust a
  // contradictory MIME even if the first few bytes match a known type.
  if (mime && mime !== 'application/octet-stream' && mime !== expected) return false
  const starts = (...header: number[]) => header.every((byte, index) => bytes[index] === byte)

  switch (extension) {
    case 'pdf': return starts(0x25, 0x50, 0x44, 0x46, 0x2d)
    case 'jpg':
    case 'jpeg': return starts(0xff, 0xd8, 0xff)
    case 'png': return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
    case 'webp': return starts(0x52, 0x49, 0x46, 0x46) &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    case 'doc':
    case 'xls': return starts(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1)
    case 'docx':
    case 'xlsx': return starts(0x50, 0x4b, 0x03, 0x04)
    default: return false
  }
}

export async function validUploadFileSignature(file: File): Promise<boolean> {
  // Never read the whole file merely to check its header; upload size limits
  // must be checked by the calling route before this function is reached.
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  return validUploadSignature(file.name, bytes, file.type)
}

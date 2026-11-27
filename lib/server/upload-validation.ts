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

// Browser-safe as well as server-safe: no Node APIs, secrets or dependencies.
// These are bounded format checks, NOT antivirus or CDR.
const MAX_OFFICE_ENTRIES = 4096
const MAX_OFFICE_EXPANSION = 100 * 1024 * 1024

function safeUploadName(name: string): boolean {
  return name.length > 0 && name.length <= 255 && /\.[a-z0-9]+$/i.test(name) && !/[\x00-\x1f\x7f/:\\]/.test(name)
}

function validOfficeArchive(bytes: Uint8Array, extension: string): boolean {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (bytes.length < 22) return false
  // Locate the end of central directory; reject multi-volume and ZIP64 archives.
  let end = -1
  for (let p = bytes.length - 22; p >= Math.max(0, bytes.length - 65557); p--) {
    if (view.getUint32(p, true) === 0x06054b50 && p + 22 + view.getUint16(p + 20, true) === bytes.length) { end = p; break }
  }
  if (end < 0 || view.getUint16(end + 4, true) !== 0 || view.getUint16(end + 6, true) !== 0) return false
  const count = view.getUint16(end + 10, true)
  const centralSize = view.getUint32(end + 12, true)
  const centralStart = view.getUint32(end + 16, true)
  if (!count || count > MAX_OFFICE_ENTRIES || count !== view.getUint16(end + 8, true) || centralStart + centralSize !== end) return false
  const names = new Set<string>()
  const offsets = new Set<number>()
  const ranges: Array<[number, number]> = []
  let expanded = 0
  let pos = centralStart
  const decoder = new TextDecoder('utf-8', { fatal: true })
  try {
    for (let i = 0; i < count; i++) {
      if (pos + 46 > end || view.getUint32(pos, true) !== 0x02014b50) return false
      const flags = view.getUint16(pos + 8, true)
      const method = view.getUint16(pos + 10, true)
      const compressed = view.getUint32(pos + 20, true)
      const uncompressed = view.getUint32(pos + 24, true)
      const nameLength = view.getUint16(pos + 28, true)
      const extraLength = view.getUint16(pos + 30, true)
      const commentLength = view.getUint16(pos + 32, true)
      const localOffset = view.getUint32(pos + 42, true)
      const next = pos + 46 + nameLength + extraLength + commentLength
      if (!nameLength || next > end || (flags & 0x2041) || ![0, 8].includes(method) || view.getUint16(pos + 34, true) !== 0 || compressed === 0xffffffff || uncompressed === 0xffffffff) return false
      const nameBytes = bytes.subarray(pos + 46, pos + 46 + nameLength)
      const name = decoder.decode(nameBytes).toLowerCase()
      const pieces = name.split('/')
      if (name.startsWith('/') || /[\x00-\x1f\x7f:\\]/.test(name) || pieces.includes('..') || pieces.includes('.') || names.has(name) || offsets.has(localOffset)) return false
      if (/(?:^|\/)(?:vbaproject(?:signature)?\.bin|vbadata\.xml|activex|embeddings)(?:\/|$)/i.test(name) || /\.(?:exe|dll|msi|bat|cmd|ps1|vbs|js|jse|hta|scr|com|lnk|jar|html?|svg)$/i.test(name)) return false
      names.add(name); offsets.add(localOffset)
      expanded += uncompressed
      if (expanded > MAX_OFFICE_EXPANSION || uncompressed > 50 * 1024 * 1024 || (uncompressed > 1024 * 1024 && uncompressed > compressed * 200) || (method === 0 && compressed !== uncompressed)) return false
      if (localOffset + 30 > centralStart || view.getUint32(localOffset, true) !== 0x04034b50 || view.getUint16(localOffset + 6, true) !== flags || view.getUint16(localOffset + 8, true) !== method) return false
      const localNameLength = view.getUint16(localOffset + 26, true)
      const localExtraLength = view.getUint16(localOffset + 28, true)
      const dataStart = localOffset + 30 + localNameLength + localExtraLength
      const dataEnd = dataStart + compressed
      if (localNameLength !== nameLength || dataEnd > centralStart || !nameBytes.every((b, j) => bytes[localOffset + 30 + j] === b)) return false
      if (!(flags & 8) && (view.getUint32(localOffset + 14, true) !== view.getUint32(pos + 16, true) || view.getUint32(localOffset + 18, true) !== compressed || view.getUint32(localOffset + 22, true) !== uncompressed)) return false
      ranges.push([localOffset, dataEnd]); pos = next
    }
  } catch { return false }
  ranges.sort((a, b) => a[0] - b[0])
  if (ranges.some((range, i) => i > 0 && range[0] < ranges[i - 1][1])) return false
  return pos === end && names.has('[content_types].xml') && names.has('_rels/.rels') && names.has(extension === 'docx' ? 'word/document.xml' : 'xl/workbook.xml')
}

export function validUploadContent(name: string, bytes: Uint8Array, mime?: string | null): boolean {
  if (!safeUploadName(name) || !bytes.length || bytes.length > 10 * 1024 * 1024 || !validUploadSignature(name, bytes, mime)) return false
  const extension = uploadExtension(name)
  return extension === 'docx' || extension === 'xlsx' ? validOfficeArchive(bytes, extension) : true
}

export async function validUploadFileContent(file: File): Promise<boolean> {
  if (!safeUploadName(file.name) || file.size <= 0 || file.size > 10 * 1024 * 1024) return false
  if (!(await validUploadFileSignature(file))) return false
  const extension = uploadExtension(file.name)
  return extension === 'docx' || extension === 'xlsx' ? validUploadContent(file.name, new Uint8Array(await file.arrayBuffer()), file.type) : true
}

export function validAttendanceImportContent(name: string, bytes: Uint8Array, mime?: string | null): boolean {
  if (!safeUploadName(name) || bytes.length === 0 || bytes.length > 10 * 1024 * 1024) return false
  const ext = uploadExtension(name)
  // Excel exports may supply alternative MIME values. Check the bytes, not browser MIME.
  if (ext === 'xls' || ext === 'xlsx') return validUploadContent(name, bytes)
  if (ext !== 'csv') return false
  const type = (mime || '').toLowerCase()
  if (type && !['text/csv','text/plain','application/csv','application/vnd.ms-excel','application/octet-stream'].includes(type)) return false
  try {
    const utf16 = bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le' : bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : 'utf-8'
    const decoded = new TextDecoder(utf16, { fatal: true }).decode(bytes)
    if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(decoded) || /^\s*</.test(decoded) || !/[;,\t]/.test(decoded)) return false
    return true
  } catch { return false }
}

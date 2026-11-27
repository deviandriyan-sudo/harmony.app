import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto'
import { uploadExpectedMime, uploadExtension } from './upload-validation'

export type UploadPurpose = 'evidence' | 'fingerprint'
export type UploadTicket = { id: string; actor: string; employee: string | null; purpose: UploadPurpose; name: string; size: number; mime: string; expires: number }
export function uploadTicketSecret() {
  const secret = process.env.HARMONY_UPLOAD_TICKET_SECRET
  if (secret && secret.length >= 32) return secret
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (secret !== undefined || serviceKey.length < 32) throw Object.assign(new Error('Upload ticket tidak tersedia.'), { status: 503 })
  // Domain-separated derived key; service credential never leaves the server.
  return createHmac('sha256', serviceKey).update('harmony/rc3n/upload-ticket/v1').digest('hex')
}
function validUuid(value: unknown): value is string { return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) }
export function makeUploadTicket(actor: string, employee: string | null, purpose: UploadPurpose, file: { name: unknown; size: unknown; mime: unknown }, now = Date.now()): UploadTicket {
  const name = typeof file.name === 'string' ? file.name : ''
  const size = file.size
  const extension = uploadExtension(name)
  const mime = purpose === 'fingerprint' && extension === 'csv' ? 'text/csv' : uploadExpectedMime(name)
  const supplied = typeof file.mime === 'string' ? file.mime.toLowerCase() : ''
  const allowed = purpose === 'fingerprint' ? ['xls','xlsx','csv'] : ['pdf','jpg','jpeg','png','webp','doc','docx','xls','xlsx']
  if (!validUuid(actor) || (employee !== null && !validUuid(employee)) || (purpose === 'evidence' && !employee) || !mime || !allowed.includes(extension) || !name || name.length > 255 || /[\x00-\x1f\x7f/:\\]/.test(name) || typeof size !== 'number' || !Number.isSafeInteger(size) || size < 1 || size > 10*1024*1024 || (purpose !== 'fingerprint' && supplied && supplied !== mime && supplied !== 'application/octet-stream')) throw Object.assign(new Error('Metadata upload tidak valid.'), { status: 400 })
  return { id: randomUUID(), actor, employee, purpose, name, size, mime, expires: now + 30*60*1000 }
}
export function encodeUploadTicket(ticket: UploadTicket, secret: string) {
  const data = Buffer.from(JSON.stringify(ticket)).toString('base64url')
  return `${data}.${createHmac('sha256', secret).update(data).digest('base64url')}`
}
export function decodeUploadTicket(value: unknown, actor: string, secret: string, now = Date.now()): UploadTicket {
  const deny = () => Object.assign(new Error('Upload ticket tidak valid atau sudah kedaluwarsa.'), { status: 403 })
  if (typeof value !== 'string' || value.length > 4096 || !/^[\w-]+\.[\w-]+$/.test(value)) throw deny()
  const [data, mac] = value.split('.')
  const expected = createHmac('sha256', secret).update(data).digest()
  const actual = Buffer.from(mac, 'base64url')
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw deny()
  let ticket: UploadTicket
  try { ticket = JSON.parse(Buffer.from(data,'base64url').toString('utf8')) } catch { throw deny() }
  if (!ticket || ticket.actor !== actor || !validUuid(ticket.id) || !Number.isSafeInteger(ticket.expires) || ticket.expires <= now || ticket.expires > now+30*60*1000 || !['evidence','fingerprint'].includes(ticket.purpose)) throw deny()
  // Revalidate the signed metadata before using any path or size.
  const checked = makeUploadTicket(ticket.actor,ticket.employee,ticket.purpose,{name:ticket.name,size:ticket.size,mime:ticket.mime},now)
  if (checked.mime !== ticket.mime) throw deny()
  return ticket
}
export function stagingPath(ticket: UploadTicket) { return `incoming/${ticket.actor}/${ticket.id}.bin` }
export function publishedPath(ticket: UploadTicket) {
  const name = ticket.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-120)
  return ticket.purpose === 'fingerprint' ? `attendance/verified/${ticket.actor}/${ticket.id}-${name}` : `verified/${ticket.employee}/${ticket.actor}/${ticket.id}-${name}`
}

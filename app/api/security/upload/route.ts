import { recordVerifiedEvidence } from '@/lib/server/private-evidence'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { requireHarmonyApi, harmonyApiError, normalizeHarmonyRole } from '@/lib/server/user-api-auth'
import { makeUploadTicket, encodeUploadTicket, decodeUploadTicket, uploadTicketSecret, stagingPath, publishedPath, type UploadPurpose } from '@/lib/server/upload-ticket'
import { QUARANTINE_BUCKET, requireCleanUpload } from '@/lib/server/malware-scan'
import { validUploadContent, validAttendanceImportContent } from '@/lib/server/upload-validation'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
const HR = new Set(['hr','admin','administrator','super_admin','human_resources'])
const reply = (data: unknown, status = 200) => NextResponse.json(data, {status, headers:{'Cache-Control':'private, no-store'}})
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireHarmonyApi(request)
    const role = normalizeHarmonyRole(ctx.appUser.role)
    const isHR = HR.has(role)
    const employeeId = ctx.employee?.id === ctx.appUser.employee_id && ctx.employee?.is_active !== false ? ctx.employee?.id || null : null
    if (!isHR && (role !== 'employee' || !employeeId)) return reply({error:'Akses upload ditolak.'},403)
    const secret = uploadTicketSecret()
    const body = await request.json()
    const permitted = (purpose: UploadPurpose) => purpose === 'fingerprint' ? isHR : purpose === 'evidence' && !!employeeId
    if (body.action === 'ticket') {
      if (!['evidence','fingerprint'].includes(body.purpose) || !permitted(body.purpose)) return reply({error:'Jenis upload tidak diizinkan.'},403)
      const ticket = makeUploadTicket(ctx.authUserId, employeeId, body.purpose, body)
      const path = stagingPath(ticket)
      const signed = await ctx.admin.storage.from(QUARANTINE_BUCKET).createSignedUploadUrl(path,{upsert:false})
      if (signed.error || !signed.data?.token) throw new Error('Staging upload tidak tersedia.')
      return reply({ticket:encodeUploadTicket(ticket,secret),path,token:signed.data.token})
    }
    if (!['scan','publish'].includes(body.action)) return reply({error:'Action upload tidak valid.'},400)
    const ticket = decodeUploadTicket(body.ticket, ctx.authUserId, secret)
    if (!permitted(ticket.purpose) || ticket.employee !== employeeId) return reply({error:'Akses upload berubah.'},403)
    const staged = await ctx.admin.storage.from(QUARANTINE_BUCKET).download(stagingPath(ticket))
    if (staged.error || !staged.data || staged.data.size !== ticket.size) return reply({error:'File staging tidak tersedia atau ukuran tidak sesuai.'},409)
    const bytes = new Uint8Array(await staged.data.arrayBuffer())
    const valid = ticket.purpose === 'fingerprint' ? validAttendanceImportContent(ticket.name,bytes,ticket.mime) : validUploadContent(ticket.name,bytes,ticket.mime)
    if (!valid) return reply({error:'Isi file tidak sesuai format; file tetap dikarantina.'},422)
    const verdict = await requireCleanUpload(ctx.admin,bytes,true)
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    if (body.action === 'scan') return reply({sha256,security_status:verdict})
    if (body.sha256 !== sha256) return reply({error:'Isi file berubah sejak pemeriksaan.'},409)
    const bucket = ticket.purpose === 'fingerprint' ? 'attendance-uploads' : 'leave-attachments'
    const path = publishedPath(ticket)
    const result = await ctx.admin.storage.from(bucket).upload(path,bytes,{upsert:false,contentType:ticket.mime,cacheControl:'0'})
    if (result.error) {
      // Retry with the same immutable ticket only if the existing bytes are identical.
      const prior = await ctx.admin.storage.from(bucket).download(path)
      if (prior.error || !prior.data || prior.data.size !== ticket.size || createHash('sha256').update(new Uint8Array(await prior.data.arrayBuffer())).digest('hex') !== sha256) throw new Error('Penerbitan upload gagal.')
    }
    await recordVerifiedEvidence(ctx.admin,bucket,path,ticket.employee,bytes,verdict)
    // Keep legacy reference shape in DB; only authorized server viewers may resolve it.
    return reply({path,referenceUrl:ctx.admin.storage.from(bucket).getPublicUrl(path).data.publicUrl,sha256,mime:ticket.mime,security_status:verdict})
  } catch (error) {
    const issue = harmonyApiError(error,'Upload belum dapat diproses. Hubungi HR.')
    return reply({error:issue.message},issue.status)
  }
}

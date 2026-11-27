import { NextRequest, NextResponse } from 'next/server'
import { requireHRApi, apiError } from '@/lib/server/hr-api-auth'
import { isNumberingModule, isDocumentNumberMode, normalizeManualDocumentNumber } from '@/lib/document-numbering'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
const headers = { 'Cache-Control': 'private, no-store' }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers })
function failure(error: unknown) {
  const code = (error as { code?: string } | null)?.code
  if (code === '42501') return reply({ message: 'Akses HR modul ini diperlukan.' }, 403)
  if (code === '23505') return reply({ message: 'Nomor sudah digunakan. Pilih nomor lain.' }, 409)
  if (code === '40001' || code === '23514') return reply({ message: 'Konfigurasi berubah atau nomor sudah terkunci. Muat ulang sebelum melanjutkan.' }, 409)
  if (code === '22023') return reply({ message: 'Nomor, status pengajuan, atau konfigurasi tidak valid. Awalan RM- dan SU- dicadangkan untuk nomor otomatis; Re-Med boleh memakai referensinya sendiri.' }, 422)
  const e = apiError(error, 'Penomoran dokumen belum dapat diproses.')
  return reply({ message: e.message }, e.status)
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireHRApi(request)
    const numberingModule = request.nextUrl.searchParams.get('module')
    const offset = Number(request.nextUrl.searchParams.get('offset') ?? '0')
    if (!isNumberingModule(numberingModule) || !Number.isInteger(offset) || offset < 0 || offset > 100000 || offset % 50 !== 0) return reply({ message: 'Parameter penomoran tidak valid.' }, 400)
    const view = request.nextUrl.searchParams.get('view')
    if (view !== null && view !== 'catalog') return reply({ message: 'Tampilan tidak valid.' }, 400)
    if (view === 'catalog') {
      const search = request.nextUrl.searchParams.get('search') ?? ''
      const state = request.nextUrl.searchParams.get('state') ?? 'all'
      const month = request.nextUrl.searchParams.get('month') ?? ''
      const status = request.nextUrl.searchParams.get('status') ?? ''
      if (search.length > 120 || !['all','issued','pending','legacy','blocked','unavailable'].includes(state) || (month !== '' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) || (status !== '' && !/^[a-z_]{1,40}$/.test(status))) return reply({ message: 'Filter dokumen tidak valid.' }, 400)
      const { data, error } = await ctx.admin.rpc('harmony_rc3q1_document_catalog_v1', { p_actor: ctx.authUserId, p_module: numberingModule, p_offset: offset, p_search: search, p_state: state, p_month: month, p_status: status })
      if (error) throw error
      if (!data || !isDocumentNumberMode(data.mode) || !Number.isSafeInteger(data.total) || data.total < 0 || !Array.isArray(data.rows) || data.rows.length > 50 || !data.counts || !Array.isArray(data.statuses) || !Array.isArray(data.mode_history)) return reply({ message: 'Daftar dokumen belum lengkap.' }, 503)
      return reply(data)
    }
    const { data, error } = await ctx.admin.rpc('harmony_rc3q_document_numbering_v1', { p_actor: ctx.authUserId, p_module: numberingModule, p_action: 'get', p_offset: offset })
    if (error) throw error
    if (!data || !isDocumentNumberMode(data.mode) || !Array.isArray(data.pending) || !Number.isSafeInteger(data.pending_count) || data.pending_count < 0) return reply({ message: 'Respons penomoran belum lengkap.' }, 503)
    return reply(data)
  } catch (error) { return failure(error) }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireHRApi(request)
    const body = await request.json().catch(() => null)
    const numberingModule = body?.module
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''
    if (!isNumberingModule(numberingModule) || reason.length < 3 || reason.length > 500) return reply({ message: 'Modul dan alasan perubahan wajib valid.' }, 400)
    const common = { p_actor: ctx.authUserId, p_module: numberingModule, p_reason: reason }
    let args: Record<string, unknown>
    if (body.action === 'set_mode' && isDocumentNumberMode(body.mode) && isDocumentNumberMode(body.expected_mode)) {
      args = { ...common, p_action: 'set_mode', p_mode: body.mode, p_expected_mode: body.expected_mode }
    } else if (body.action === 'issue' && typeof body.document_id === 'string' && uuid.test(body.document_id)) {
      const number = normalizeManualDocumentNumber(body.number)
      if (!number) return reply({ message: 'Nomor wajib 1–80 karakter: huruf, angka, / . _ -.' }, 400)
      args = { ...common, p_action: 'issue', p_document_id: body.document_id, p_number: number }
    } else return reply({ message: 'Aksi penomoran tidak valid.' }, 400)
    const { data, error } = await ctx.admin.rpc('harmony_rc3q_document_numbering_v1', args)
    if (error) throw error
    if (!data || typeof data !== 'object' || (args.p_action === 'set_mode' ? data.mode !== args.p_mode : data.document_number !== args.p_number)) return reply({ message: 'Hasil belum dapat diverifikasi. Muat ulang sebelum mencoba kembali.' }, 503)
    return reply(data)
  } catch (error) { return failure(error) }
}

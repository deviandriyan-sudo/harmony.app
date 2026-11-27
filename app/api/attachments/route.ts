import { recordVerifiedEvidence, verifiedEvidenceOwner, scannedSignedUrl } from '@/lib/server/private-evidence'
import { requireCleanFile } from '@/lib/server/malware-scan'
import { getPHLSubordinateIds } from '@/lib/server/phl-work'

import { parseLegacyEvidenceUrl, validEvidenceObjectPath } from '@/lib/evidence-url'
import { validUploadFileContent } from '@/lib/server/upload-validation'
import { unreferencedAttendanceProofPaths } from '@/lib/server/phl-evidence-preservation'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const BUCKET = 'leave-attachments'
const MAX_FILES = 3
const REQUIRED_FILES = 1
const MAX_FILE_BYTES = 10 * 1024 * 1024
const ENTITY_TYPES = new Set([
  'leave_request',
  'phl_record',
  'phl_adjustment',
  'attendance_log',
  'leave_postpone',
])
const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'doc',
  'docx',
  'xls',
  'xlsx',
])

function clean(value: unknown) {
  return String(value || '').trim()
}

function normalize(value: unknown) {
  return clean(value).toLowerCase()
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

function safeFileName(value: string) {
  return value
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(-120) || 'file'
}

async function validateFile(file: File) {
  const extension = clean(file.name).split('.').pop()?.toLowerCase() || ''
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return 'Format file tidak didukung. Gunakan PDF, JPG, PNG, WEBP, DOC/DOCX, atau XLS/XLSX.'
  }

  if (file.size > MAX_FILE_BYTES) {
    return `Ukuran ${file.name} melebihi 10 MB.`
  }

  if (!(await validUploadFileContent(file))) {
    return 'Isi file tidak sesuai dengan format atau MIME dokumen.'
  }

  return ''
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) return null

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

type Identity = {
  authUserId: string
  email: string
  role: string
  employeeId: string | null
  isHR: boolean
}

async function resolveIdentity(request: NextRequest, admin: SupabaseClient) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()

  if (!token) {
    return {
      error: NextResponse.json({ success: false, error: 'Token login tidak ditemukan.' }, { status: 401 }),
      identity: null,
    }
  }

  const { data: authData, error: authError } = await admin.auth.getUser(token)

  if (authError || !authData.user) {
    return {
      error: NextResponse.json({ success: false, error: 'Session login tidak valid.' }, { status: 401 }),
      identity: null,
    }
  }

  let appUser: { role?: string | null; employee_id?: string | null; email?: string | null; is_active?: boolean | null } | null = null

  const byId = await admin
    .from('app_users')
    .select('id,email,role,employee_id,is_active')
    .eq('id', authData.user.id)
    .maybeSingle()

  // Authorization uses only the verified JWT subject. Email lookup may
  // inadvertently borrow another user's role when an address is reassigned.
  if (byId.error) throw byId.error
  if (byId.data) appUser = byId.data

  if (!appUser || appUser.is_active === false) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Akun HARMONY tidak aktif atau belum terhubung.' },
        { status: 403 },
      ),
      identity: null,
    }
  }

  const role = normalize(appUser.role)
  const isHR = ['hr', 'admin', 'administrator', 'super_admin', 'human_resources'].includes(role)
  if (!isHR) {
    if (role !== 'employee' || !appUser.employee_id) {
      return { error: NextResponse.json({ success: false, error: 'Akses evidence ditolak.' }, { status: 403 }), identity: null }
    }
    const employee = await admin.from('employees').select('id,is_active').eq('id', appUser.employee_id).maybeSingle()
    if (employee.error) throw employee.error
    if (!employee.data || employee.data.is_active === false) {
      return { error: NextResponse.json({ success: false, error: 'Employee Master tidak aktif.' }, { status: 403 }), identity: null }
    }
  }
  const identity: Identity = {
    authUserId: authData.user.id,
    email: normalize(authData.user.email || appUser.email),
    role,
    employeeId: appUser.employee_id || null,
    isHR,
  }

  return { error: null, identity }
}

async function loadParent(
  admin: SupabaseClient,
  entityType: string,
  entityId: string,
) {
  if (entityType === 'leave_request') {
    const result = await admin
      .from('leave_requests')
      .select('id,employee_id,request_type,status,supervisor_status,hr_status,proof_file_url,proof_file_name,proof_file_size,proof_file_type,proof_url')
      .eq('id', entityId)
      .maybeSingle()
    return { ...result, entityType }
  }

  if (entityType === 'phl_record') {
    const result = await admin
      .from('phl_records')
      .select('id,employee_id,source,status,supervisor_status,hr_status,proof_file_url,proof_file_name,proof_file_size,proof_file_type')
      .eq('id', entityId)
      .maybeSingle()
    return { ...result, entityType }
  }

  if (entityType === 'phl_adjustment') {
    const result = await admin
      .from('phl_hr_adjustments')
      .select('id,request_key,employee_id,action,days,phl_date,created_at')
      .eq('id', entityId)
      .maybeSingle()
    return { ...result, entityType }
  }

  if (entityType === 'attendance_log') {
    const result = await admin
      .from('attendance_logs')
      .select(
        'id,employee_id,attendance_date,employee_confirmation_type,absence_request_type,employee_confirmation_status,supervisor_approval_status,hr_approval_status,hr_final_status,is_locked,deleted_at,correction_proof_url,correction_proof_name,absence_proof_url,absence_proof_name,phl_proof_url,phl_proof_name,proof_file_url,proof_file_name,proof_file_size,proof_file_type',
      )
      .eq('id', entityId)
      .maybeSingle()
    return { ...result, entityType }
  }

  const result = await admin
    .from('leave_postpone_requests')
    .select(
      'id,employee_id,approval_status,supervisor_1_status,supervisor_2_status,hr_status,is_active',
    )
    .eq('id', entityId)
    .maybeSingle()
  return { ...result, entityType }
}

async function parentRequiresProof(admin: SupabaseClient, entityType: string, parent: Record<string, unknown>) {
  let requestTypeCode = ''

  if (entityType === 'leave_request') {
    requestTypeCode = clean(parent?.request_type)
  } else if (entityType === 'attendance_log') {
    requestTypeCode = clean(parent?.absence_request_type || parent?.employee_confirmation_type)
  }

  if (!requestTypeCode) return false

  const { data, error } = await admin
    .from('harmony_request_types')
    .select('requires_proof,is_active')
    .eq('code', requestTypeCode)
    .maybeSingle()

  if (error || !data || data.is_active === false) return false
  return data.requires_proof === true
}

async function isSupervisorOfOwner(
  admin: SupabaseClient,
  identity: Identity,
  ownerEmployeeId: string,
) {
  if (!identity.employeeId || identity.employeeId === ownerEmployeeId) return false

  // Shared PHL/dashboard resolver checks active identity, unique references and effective assignments.
  return (await getPHLSubordinateIds(admin, { id: identity.employeeId })).includes(ownerEmployeeId)
}

async function canViewParent(
  admin: SupabaseClient,
  identity: Identity,
  parent: Record<string, unknown>,
) {
  const ownerEmployeeId = clean(parent?.employee_id)
  if (!ownerEmployeeId) return identity.isHR
  if (identity.isHR) return true
  if (identity.employeeId === ownerEmployeeId) return true
  return isSupervisorOfOwner(admin, identity, ownerEmployeeId)
}

function ownerCanInitializeSubmittedParent(entityType: string, parent: Record<string, unknown> | null) {
  if (entityType === 'leave_request' || entityType === 'phl_record') {
    const supervisor = normalize(parent?.supervisor_status)
    const hr = normalize(parent?.hr_status)
    const status = normalize(parent?.status)

    return (
      !['approved', 'rejected', 'cancelled', 'canceled'].includes(supervisor) &&
      !['approved', 'finalized', 'cancelled', 'canceled', 'rejected'].includes(hr) &&
      !['approved', 'cancelled', 'canceled', 'rejected'].includes(status)
    )
  }

  if (entityType === 'leave_postpone') {
    return (
      normalize(parent?.supervisor_1_status) !== 'approved' &&
      normalize(parent?.supervisor_2_status) !== 'approved' &&
      !['approved', 'cancelled', 'canceled', 'rejected'].includes(normalize(parent?.approval_status))
    )
  }

  return false
}

function attendanceIsEditable(parent: Record<string, unknown> | null) {
  if (parent?.deleted_at || parent?.is_locked) return false

  const employeeStatus = normalize(parent?.employee_confirmation_status)
  const supervisor = normalize(parent?.supervisor_approval_status)
  const hr = normalize(parent?.hr_final_status || parent?.hr_approval_status)

  if (employeeStatus === 'submitted') return false
  if (['approved', 'rejected'].includes(supervisor)) return false
  if (['ready_for_hr', 'approved', 'finalized'].includes(hr)) return false

  return true
}

function legacyReferences(parent: Record<string, unknown>) {
  return [
    { url: clean(parent.proof_file_url), name: clean(parent.proof_file_name), size: parent.proof_file_size, type: parent.proof_file_type },
    { url: clean(parent.proof_url), name: clean(parent.proof_file_name), size: parent.proof_file_size, type: parent.proof_file_type },
    { url: clean(parent.absence_proof_url), name: clean(parent.absence_proof_name), size: null, type: null },
    { url: clean(parent.correction_proof_url), name: clean(parent.correction_proof_name), size: null, type: null },
    { url: clean(parent.phl_proof_url), name: clean(parent.phl_proof_name), size: null, type: null },
  ].filter(item => item.url)
}

function parseEvidence(value: unknown) {
  return parseLegacyEvidenceUrl(value, process.env.NEXT_PUBLIC_SUPABASE_URL)
}

function storagePathFromPublicUrl(fileUrl: string) {
  const parsed = parseEvidence(fileUrl)
  return parsed?.bucket === BUCKET ? parsed.path : ''
}

// Only after parent authorization. Return existing same-project legacy references;
// never allow arbitrary external links, nor trust fallback URLs supplied by the UI.
// This is compatibility handling, not the final private-bucket migration.
function readableAttachments(rows: Record<string, unknown>[], parent: Record<string, unknown>, entityType: string, entityId: string) {
  const results: Record<string, unknown>[] = []
  const keys = new Set<string>()
  for (const row of rows) {
    const parsed = parseEvidence(row.file_url)
    if (!parsed || (row.storage_bucket && row.storage_bucket !== parsed.bucket) || (row.storage_path && row.storage_path !== parsed.path)) continue
    const key = `${parsed.bucket}/${parsed.path}`
    if (keys.has(key)) continue
    keys.add(key)
    results.push({ ...row, file_url: parsed.url })
  }
  for (const ref of legacyReferences(parent)) {
    const parsed = parseEvidence(ref.url)
    if (!parsed) continue
    const key = `${parsed.bucket}/${parsed.path}`
    if (keys.has(key)) continue
    keys.add(key)
    results.push({ id: `legacy-${results.length + 1}`, entity_type: entityType, entity_id: entityId,
      owner_employee_id: parent.employee_id || null, slot_no: results.length + 1,
      attachment_kind: 'legacy', file_url: parsed.url, file_name: ref.name || 'Dokumen Pendukung',
      file_size: ref.size || null, file_type: ref.type || null, storage_bucket: parsed.bucket,
      storage_path: parsed.path, is_legacy: true, created_at: '' })
  }
  return results.slice(0, MAX_FILES)
}

async function secureReadableAttachments(admin:SupabaseClient,rows:Record<string,unknown>[],parent:Record<string,unknown>,entityType:string,entityId:string) {
  const owner=clean(parent.employee_id)
  const attachments=readableAttachments(rows,parent,entityType,entityId)
  const results:Record<string,unknown>[]=[]
  for(const attachment of attachments) {
    const bucket=clean(attachment.storage_bucket),path=clean(attachment.storage_path)
    const verified=await verifiedEvidenceOwner(admin,bucket,path,owner)
    const signed=verified?await scannedSignedUrl(admin,bucket,path):null
    // Preserve the item/metadata so users know the document exists; do not expose a raw fallback.
    results.push({...attachment,file_url:signed || '',security_status:signed?'clean':'blocked_or_unverified'})
  }
  return results
}

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminClient()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Supabase server environment belum lengkap.' },
        { status: 500 },
      )
    }

    const auth = await resolveIdentity(request, admin)
    if (auth.error || !auth.identity) return auth.error

    const entityType = clean(request.nextUrl.searchParams.get('entity_type'))
    const entityId = clean(request.nextUrl.searchParams.get('entity_id'))

    if (!ENTITY_TYPES.has(entityType) || !isUuid(entityId)) {
      return NextResponse.json(
        { success: false, error: 'Entity lampiran tidak valid.' },
        { status: 400 },
      )
    }

    if (entityType === 'phl_adjustment' && !auth.identity.isHR) {
      return NextResponse.json(
        { success: false, error: 'Evidence penyesuaian PHL manual hanya dapat dilihat HR/Admin.' },
        { status: 403 },
      )
    }

    const parentResult = await loadParent(admin, entityType, entityId)
    if (parentResult.error) throw parentResult.error
    if (!parentResult.data) {
      return NextResponse.json(
        { success: false, error: 'Data induk lampiran tidak ditemukan.' },
        { status: 404 },
      )
    }

    if (!(await canViewParent(admin, auth.identity, parentResult.data))) {
      return NextResponse.json(
        { success: false, error: 'Anda tidak memiliki akses ke lampiran ini.' },
        { status: 403 },
      )
    }

    const { data, error } = await admin
      .from('harmony_request_attachments')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('slot_no', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      success: true,
      attachments: await secureReadableAttachments(admin,data || [],parentResult.data,entityType,entityId),
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Lampiran gagal dimuat.' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = getAdminClient()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Supabase server environment belum lengkap.' },
        { status: 500 },
      )
    }

    const auth = await resolveIdentity(request, admin)
    if (auth.error || !auth.identity) return auth.error

    const body = await request.formData()
    const entityType = clean(body.get('entity_type'))
    const entityId = clean(body.get('entity_id'))
    const attachmentKind = clean(body.get('attachment_kind')) || 'supporting_document'

    if (!ENTITY_TYPES.has(entityType) || !isUuid(entityId)) {
      return NextResponse.json(
        { success: false, error: 'Entity lampiran tidak valid.' },
        { status: 400 },
      )
    }

    if (entityType === 'phl_adjustment' && !auth.identity.isHR) {
      return NextResponse.json(
        { success: false, error: 'Hanya HR/Admin yang dapat menyimpan evidence penyesuaian PHL manual.' },
        { status: 403 },
      )
    }

    const parentResult = await loadParent(admin, entityType, entityId)
    if (parentResult.error) throw parentResult.error
    const parent = parentResult.data as Record<string, unknown> | null

    if (!parent) {
      return NextResponse.json(
        { success: false, error: 'Data induk lampiran tidak ditemukan.' },
        { status: 404 },
      )
    }

    const ownerEmployeeId = clean(parent.employee_id)
    const isOwner = Boolean(ownerEmployeeId && auth.identity.employeeId === ownerEmployeeId)

    if (!isOwner && !auth.identity.isHR) {
      return NextResponse.json(
        { success: false, error: 'Hanya pemilik pengajuan atau HR yang dapat menyimpan lampiran.' },
        { status: 403 },
      )
    }

    const { data: existingRows, error: existingError } = await admin
      .from('harmony_request_attachments')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('slot_no', { ascending: true })

    if (existingError) throw existingError

    const existing = existingRows || []

    if (isOwner && !auth.identity.isHR) {
      if (entityType === 'attendance_log') {
        const supervisorStatus = normalize(parent?.supervisor_approval_status)
        const stillWaitingSupervisor =
          normalize(parent?.employee_confirmation_status) === 'submitted' &&
          ['', 'pending', 'submitted', 'waiting_supervisor', 'pending_supervisor'].includes(
            supervisorStatus,
          )

        if (!attendanceIsEditable(parent) && !stillWaitingSupervisor) {
          return NextResponse.json(
            { success: false, error: 'Lampiran absensi sudah terkunci setelah diproses atasan.' },
            { status: 409 },
          )
        }
      } else if (existing.length > 0 || !ownerCanInitializeSubmittedParent(entityType, parent)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Lampiran pengajuan hanya dapat diregistrasikan saat pengajuan awal dibuat.',
          },
          { status: 409 },
        )
      }
    }

    const legacyUrl = clean(body.get('legacy_url'))
    const legacyName = clean(body.get('legacy_name')) || 'Dokumen Pendukung'
    const legacySize = Number(clean(body.get('legacy_size')) || 0) || null
    const legacyType = clean(body.get('legacy_type')) || null
    const suppliedLegacyPath = clean(body.get('legacy_storage_path')) || null
    const parsedLegacy = legacyUrl ? parseEvidence(legacyUrl) : null
    if (legacyUrl && (!parsedLegacy || parsedLegacy.bucket !== BUCKET ||
        (suppliedLegacyPath && suppliedLegacyPath !== parsedLegacy.path) ||
        !legacyReferences(parent).some(ref => {
          const candidate = parseEvidence(ref.url)
          return candidate?.bucket === parsedLegacy.bucket && candidate.path === parsedLegacy.path
        }))) {
      return NextResponse.json({ success: false, error: 'Referensi evidence tidak sesuai dengan data induk atau Storage HARMONY.' }, { status: 400 })
    }
    if (parsedLegacy && !(await verifiedEvidenceOwner(admin,parsedLegacy.bucket,parsedLegacy.path,ownerEmployeeId))) {
      return NextResponse.json({success:false,error:'Pemilik file evidence belum terverifikasi. Hubungi HR.'},{status:403})
    }
    const legacyStoragePath = parsedLegacy?.path || null
    const files = body
      .getAll('files')
      .filter((item): item is File => item instanceof File && item.size > 0)

    const fileVerdicts = new Map<File, Awaited<ReturnType<typeof requireCleanFile>>>()
    for (const file of files) {
      const validation = await validateFile(file)
      if (validation) {
        return NextResponse.json({ success: false, error: validation }, { status: 400 })
      }
      fileVerdicts.set(file, await requireCleanFile(admin, file))
    }

    const existingUrls = new Set(existing.map((item) => clean(item.file_url)).filter(Boolean))
    const requestedNewCount = (legacyUrl && !existingUrls.has(legacyUrl) ? 1 : 0) + files.length

    const finalAttachmentCount = existing.length + requestedNewCount

    if (finalAttachmentCount > MAX_FILES) {
      return NextResponse.json(
        { success: false, error: 'Maksimal 3 dokumen pendukung untuk satu proses.' },
        { status: 400 },
      )
    }

    if (
      isOwner &&
      !auth.identity.isHR &&
      (await parentRequiresProof(admin, entityType, parent)) &&
      finalAttachmentCount < REQUIRED_FILES
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Jenis pengajuan ini wajib memiliki ${REQUIRED_FILES} dokumen pendukung sebelum dapat dikirim.`,
        },
        { status: 400 },
      )
    }

    const usedSlots = new Set(existing.map((item) => Number(item.slot_no)))
    const availableSlots = [1, 2, 3].filter((slot) => !usedSlots.has(slot))
    const rowsToInsert: Array<Record<string, unknown>> = []
    const uploadedPathsThisRequest: string[] = []

    if (legacyUrl && !existingUrls.has(legacyUrl)) {
      const slot = availableSlots.shift()
      if (!slot) throw new Error('Slot lampiran tidak tersedia.')

      rowsToInsert.push({
        entity_type: entityType,
        entity_id: entityId,
        owner_employee_id: ownerEmployeeId || null,
        slot_no: slot,
        attachment_kind: attachmentKind,
        file_url: legacyUrl,
        file_name: legacyName,
        file_size: legacySize,
        file_type: legacyType,
        storage_bucket: BUCKET,
        storage_path: legacyStoragePath,
        is_legacy: true,
        created_by_user_id: auth.identity.authUserId,
      })
    }

    try {
      for (const file of files) {
        const slot = availableSlots.shift()
        if (!slot) throw new Error('Slot lampiran tidak tersedia.')

        const storagePath = `${entityType}/${ownerEmployeeId || 'unknown'}/${entityId}/${slot}-${crypto.randomUUID()}-${safeFileName(file.name)}`
        const buffer = Buffer.from(await file.arrayBuffer())

        const upload = await admin.storage.from(BUCKET).upload(storagePath, buffer, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        })

        if (upload.error) throw upload.error
        uploadedPathsThisRequest.push(storagePath)
        const verdict = fileVerdicts.get(file)
        if (!verdict) throw new Error('Status pemeriksaan file tidak ditemukan.')
        await recordVerifiedEvidence(admin,BUCKET,storagePath,ownerEmployeeId || null,buffer,verdict)

        const { data: publicUrlData } = admin.storage.from(BUCKET).getPublicUrl(storagePath)

        rowsToInsert.push({
          entity_type: entityType,
          entity_id: entityId,
          owner_employee_id: ownerEmployeeId || null,
          slot_no: slot,
          attachment_kind: attachmentKind,
          file_url: publicUrlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type || null,
          storage_bucket: BUCKET,
          storage_path: storagePath,
          is_legacy: false,
          created_by_user_id: auth.identity.authUserId,
        })
      }

      if (rowsToInsert.length > 0) {
        const { error: insertError } = await admin
          .from('harmony_request_attachments')
          .insert(rowsToInsert)

        if (insertError) throw insertError
      }
    } catch (writeError) {
      if (uploadedPathsThisRequest.length > 0) {
        console.warn('HARMONY attachment upload retained', {count:uploadedPathsThisRequest.length})
      }
      throw writeError
    }

    const { data: attachments, error: fetchError } = await admin
      .from('harmony_request_attachments')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('slot_no', { ascending: true })

    if (fetchError) {
      const knownCount = existing.length + rowsToInsert.length
      return NextResponse.json({
        success: true,
        attachments: rowsToInsert.map(row => ({...row,file_url:''})),
        message: `${knownCount} dokumen pendukung tersimpan.`,
        warning: 'Dokumen sudah tersimpan tetapi daftar lampiran belum dapat dimuat ulang.',
      })
    }

    return NextResponse.json({
      success: true,
      attachments: (attachments || []).map(row=>({...row,file_url:''})),
      message: `${attachments?.length || 0} dokumen pendukung tersimpan.`,
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Lampiran gagal disimpan.' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = getAdminClient()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Supabase server environment belum lengkap.' },
        { status: 500 },
      )
    }

    const auth = await resolveIdentity(request, admin)
    if (auth.error || !auth.identity) return auth.error

    const body = await request.json().catch(() => null)
    const attachmentId = clean(body?.attachment_id)

    if (!isUuid(attachmentId)) {
      return NextResponse.json(
        { success: false, error: 'ID lampiran tidak valid.' },
        { status: 400 },
      )
    }

    const { data: attachment, error: attachmentError } = await admin
      .from('harmony_request_attachments')
      .select('*')
      .eq('id', attachmentId)
      .maybeSingle()

    if (attachmentError) throw attachmentError
    if (!attachment) {
      return NextResponse.json(
        { success: false, error: 'Lampiran tidak ditemukan.' },
        { status: 404 },
      )
    }

    const parentResult = await loadParent(admin, attachment.entity_type, attachment.entity_id)
    if (parentResult.error) throw parentResult.error
    const parent = parentResult.data as Record<string, unknown> | null

    if (!parent) {
      return NextResponse.json(
        { success: false, error: 'Data induk lampiran tidak ditemukan.' },
        { status: 404 },
      )
    }

    const isOwner =
      Boolean(auth.identity.employeeId) &&
      auth.identity.employeeId === clean(parent.employee_id)

    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: 'Hanya employee pemilik yang dapat menghapus lampiran draft.' },
        { status: 403 },
      )
    }

    if (attachment.entity_type !== 'attendance_log' || !attendanceIsEditable(parent)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Lampiran hanya dapat dihapus dari absensi yang masih draft sebelum Submit Periode.',
        },
        { status: 409 },
      )
    }

    const verifiedPath = storagePathFromPublicUrl(attachment.file_url)
    const savedPath = clean(attachment.storage_path)
    const path = verifiedPath && (!savedPath || (validEvidenceObjectPath(savedPath) && savedPath === verifiedPath)) ? verifiedPath : ''

    if (path) {
      const disposablePaths = await unreferencedAttendanceProofPaths(
        admin, [path], [attachment.file_url],
      )
      if (disposablePaths.length > 0) {
        const remove = await admin.storage.from(BUCKET).remove(disposablePaths)
        if (remove.error) throw remove.error
      }
    }

    const { error: deleteError } = await admin
      .from('harmony_request_attachments')
      .delete()
      .eq('id', attachment.id)

    if (deleteError) throw deleteError

    const { data: remaining } = await admin
      .from('harmony_request_attachments')
      .select('*')
      .eq('entity_type', 'attendance_log')
      .eq('entity_id', attachment.entity_id)
      .order('slot_no', { ascending: true })

    const fallback = (remaining || [])[0] || null
    const deletedUrl = clean(attachment.file_url)
    const updatePayload: Record<string, unknown> = {}

    if (clean(parent.absence_proof_url) === deletedUrl) {
      updatePayload.absence_proof_url = fallback?.file_url || null
      updatePayload.absence_proof_name = fallback?.file_name || null
    }

    if (clean(parent.correction_proof_url) === deletedUrl) {
      updatePayload.correction_proof_url = fallback?.file_url || null
      updatePayload.correction_proof_name = fallback?.file_name || null
    }

    if (clean(parent.phl_proof_url) === deletedUrl) {
      const phlFallback = (remaining || []).find((item) =>
        normalize(item.attachment_kind).includes('phl'),
      )
      updatePayload.phl_proof_url = phlFallback?.file_url || null
      updatePayload.phl_proof_name = phlFallback?.file_name || null
    }

    if (Object.keys(updatePayload).length > 0) {
      updatePayload.updated_at = new Date().toISOString()
      const { error: updateError } = await admin
        .from('attendance_logs')
        .update(updatePayload)
        .eq('id', attachment.entity_id)

      if (updateError) throw updateError
    }

    return NextResponse.json({
      success: true,
      message: 'Lampiran draft berhasil dihapus.',
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Lampiran gagal dihapus.' },
      { status: 500 },
    )
  }
}

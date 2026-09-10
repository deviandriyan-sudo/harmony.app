import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const BUCKET = 'leave-attachments'
const MAX_FILES = 3
const MAX_FILE_BYTES = 10 * 1024 * 1024
const ENTITY_TYPES = new Set([
  'leave_request',
  'phl_record',
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

function validateFile(file: File) {
  const extension = clean(file.name).split('.').pop()?.toLowerCase() || ''
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return 'Format file tidak didukung. Gunakan PDF, JPG, PNG, WEBP, DOC/DOCX, atau XLS/XLSX.'
  }

  if (file.size > MAX_FILE_BYTES) {
    return `Ukuran ${file.name} melebihi 10 MB.`
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

async function resolveIdentity(request: NextRequest, admin: any) {
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

  let appUser: any = null

  const byId = await admin
    .from('app_users')
    .select('id,email,role,employee_id,is_active')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (!byId.error && byId.data) {
    appUser = byId.data
  } else if (authData.user.email) {
    const byEmail = await admin
      .from('app_users')
      .select('id,email,role,employee_id,is_active')
      .ilike('email', authData.user.email)
      .maybeSingle()

    if (!byEmail.error) appUser = byEmail.data
  }

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
  const identity: Identity = {
    authUserId: authData.user.id,
    email: normalize(authData.user.email || appUser.email),
    role,
    employeeId: appUser.employee_id || null,
    isHR: ['hr', 'admin', 'administrator', 'super_admin'].includes(role),
  }

  return { error: null, identity }
}

async function loadParent(
  admin: any,
  entityType: string,
  entityId: string,
) {
  if (entityType === 'leave_request') {
    const result = await admin
      .from('leave_requests')
      .select('id,employee_id,status,supervisor_status,hr_status')
      .eq('id', entityId)
      .maybeSingle()
    return { ...result, entityType }
  }

  if (entityType === 'phl_record') {
    const result = await admin
      .from('phl_records')
      .select('id,employee_id,source,status,supervisor_status,hr_status')
      .eq('id', entityId)
      .maybeSingle()
    return { ...result, entityType }
  }

  if (entityType === 'attendance_log') {
    const result = await admin
      .from('attendance_logs')
      .select(
        'id,employee_id,attendance_date,employee_confirmation_status,supervisor_approval_status,hr_approval_status,hr_final_status,is_locked,deleted_at,correction_proof_url,correction_proof_name,absence_proof_url,absence_proof_name,phl_proof_url,phl_proof_name',
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

async function isSupervisorOfOwner(
  admin: any,
  identity: Identity,
  ownerEmployeeId: string,
) {
  if (!identity.employeeId || identity.employeeId === ownerEmployeeId) return false

  const [ownerResult, actorResult] = await Promise.all([
    admin
      .from('employees')
      .select('id,supervisor_1,supervisor_2')
      .eq('id', ownerEmployeeId)
      .maybeSingle(),
    admin
      .from('employees')
      .select('id,employee_number,machine_pin,full_name,email')
      .eq('id', identity.employeeId)
      .maybeSingle(),
  ])

  if (ownerResult.error || actorResult.error || !ownerResult.data || !actorResult.data) {
    return false
  }

  const supervisorValues = [ownerResult.data.supervisor_1, ownerResult.data.supervisor_2]
    .map(normalize)
    .filter(Boolean)

  const actorValues = [
    actorResult.data.id,
    actorResult.data.employee_number,
    actorResult.data.machine_pin,
    actorResult.data.full_name,
    actorResult.data.email,
    identity.email,
    identity.authUserId,
  ]
    .map(normalize)
    .filter(Boolean)

  return supervisorValues.some((value) => actorValues.includes(value))
}

async function canViewParent(
  admin: any,
  identity: Identity,
  parent: any,
) {
  const ownerEmployeeId = clean(parent?.employee_id)
  if (!ownerEmployeeId) return identity.isHR
  if (identity.isHR) return true
  if (identity.employeeId === ownerEmployeeId) return true
  return isSupervisorOfOwner(admin, identity, ownerEmployeeId)
}

function ownerCanInitializeSubmittedParent(entityType: string, parent: any) {
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

function attendanceIsEditable(parent: any) {
  if (parent?.deleted_at || parent?.is_locked) return false

  const employeeStatus = normalize(parent?.employee_confirmation_status)
  const supervisor = normalize(parent?.supervisor_approval_status)
  const hr = normalize(parent?.hr_final_status || parent?.hr_approval_status)

  if (employeeStatus === 'submitted') return false
  if (['approved', 'rejected'].includes(supervisor)) return false
  if (['ready_for_hr', 'approved', 'finalized'].includes(hr)) return false

  return true
}

function storagePathFromPublicUrl(fileUrl: string) {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const index = fileUrl.indexOf(marker)
  if (index < 0) return ''

  try {
    return decodeURIComponent(fileUrl.slice(index + marker.length))
  } catch {
    return fileUrl.slice(index + marker.length)
  }
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
      attachments: data || [],
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Lampiran gagal dimuat.' },
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

    const parentResult = await loadParent(admin, entityType, entityId)
    if (parentResult.error) throw parentResult.error
    const parent: any = parentResult.data

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
    const legacyStoragePath = clean(body.get('legacy_storage_path')) || null
    const files = body
      .getAll('files')
      .filter((item): item is File => item instanceof File && item.size > 0)

    for (const file of files) {
      const validation = validateFile(file)
      if (validation) {
        return NextResponse.json({ success: false, error: validation }, { status: 400 })
      }
    }

    const existingUrls = new Set(existing.map((item: any) => clean(item.file_url)).filter(Boolean))
    const requestedNewCount = (legacyUrl && !existingUrls.has(legacyUrl) ? 1 : 0) + files.length

    if (existing.length + requestedNewCount > MAX_FILES) {
      return NextResponse.json(
        { success: false, error: 'Maksimal 3 dokumen pendukung untuk satu proses.' },
        { status: 400 },
      )
    }

    const usedSlots = new Set(existing.map((item: any) => Number(item.slot_no)))
    const availableSlots = [1, 2, 3].filter((slot) => !usedSlots.has(slot))
    const rowsToInsert: any[] = []

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

      if (insertError) {
        const uploadedPaths = rowsToInsert
          .map((row) => clean(row.storage_path))
          .filter(Boolean)
        if (uploadedPaths.length > 0) {
          await admin.storage.from(BUCKET).remove(uploadedPaths)
        }
        throw insertError
      }
    }

    const { data: attachments, error: fetchError } = await admin
      .from('harmony_request_attachments')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('slot_no', { ascending: true })

    if (fetchError) throw fetchError

    return NextResponse.json({
      success: true,
      attachments: attachments || [],
      message: `${attachments?.length || 0} dokumen pendukung tersimpan.`,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Lampiran gagal disimpan.' },
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
    const parent: any = parentResult.data

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

    const path = clean(attachment.storage_path) || storagePathFromPublicUrl(attachment.file_url)

    if (path) {
      const remove = await admin.storage.from(BUCKET).remove([path])
      if (remove.error) throw remove.error
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
      const phlFallback = (remaining || []).find((item: any) =>
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
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Lampiran gagal dihapus.' },
      { status: 500 },
    )
  }
}

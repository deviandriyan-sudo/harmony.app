import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const BUCKET = 'leave-attachments'
const MAX_FILES = 3
const MAX_FILE_BYTES = 10 * 1024 * 1024
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
  return (
    value
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .slice(-120) || 'file'
  )
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

function getClients(token: string) {
  const supabaseUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const serviceRoleKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  const anonKey = clean(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
  )

  if (!supabaseUrl || !serviceRoleKey || !anonKey) return null

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const user = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })

  return { admin, user }
}

async function cleanupFiles(admin: any, paths: string[]) {
  if (paths.length === 0) return
  await admin.storage.from(BUCKET).remove(paths)
}

export async function POST(request: NextRequest) {
  const uploadedPaths: string[] = []

  try {
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Session login tidak ditemukan.' },
        { status: 401 },
      )
    }

    const clients = getClients(token)

    if (!clients) {
      return NextResponse.json(
        { success: false, error: 'Supabase server environment belum lengkap.' },
        { status: 500 },
      )
    }

    const { admin, user } = clients

    const { data: authData, error: authError } = await admin.auth.getUser(token)

    if (authError || !authData.user) {
      return NextResponse.json(
        { success: false, error: 'Session login tidak valid. Silakan login ulang.' },
        { status: 401 },
      )
    }

    const { data: appUser, error: appUserError } = await admin
      .from('app_users')
      .select('id,email,role,is_active')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (appUserError || !appUser || appUser.is_active === false) {
      return NextResponse.json(
        { success: false, error: 'Akun HARMONY tidak aktif atau belum terhubung.' },
        { status: 403 },
      )
    }

    const role = normalize(appUser.role)
    const isHR = ['hr', 'admin', 'administrator', 'super_admin'].includes(role)

    if (!isHR) {
      return NextResponse.json(
        { success: false, error: 'Hanya HR/Admin yang dapat menyesuaikan saldo PHL manual.' },
        { status: 403 },
      )
    }

    const body = await request.formData()

    const requestKey = clean(body.get('request_key'))
    const employeeId = clean(body.get('employee_id'))
    const action = normalize(body.get('action'))
    const days = Number(clean(body.get('days')) || 0)
    const phlDate = clean(body.get('phl_date'))
    const description = clean(body.get('description'))
    const reason = clean(body.get('reason'))
    const actorEmail = clean(authData.user.email || appUser.email) || 'HR Administrator'

    const files = body
      .getAll('files')
      .filter((item): item is File => item instanceof File && item.size > 0)

    if (!isUuid(requestKey)) {
      return NextResponse.json(
        { success: false, error: 'Request key penyesuaian PHL tidak valid.' },
        { status: 400 },
      )
    }

    if (!isUuid(employeeId)) {
      return NextResponse.json(
        { success: false, error: 'Employee ID tidak valid.' },
        { status: 400 },
      )
    }

    if (!['add', 'subtract'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Jenis penyesuaian PHL tidak valid.' },
        { status: 400 },
      )
    }

    if (!Number.isFinite(days) || days <= 0) {
      return NextResponse.json(
        { success: false, error: 'Jumlah penyesuaian PHL harus lebih dari 0 hari.' },
        { status: 400 },
      )
    }

    if (action === 'add' && !/^\d{4}-\d{2}-\d{2}$/.test(phlDate)) {
      return NextResponse.json(
        { success: false, error: 'Tanggal pelaksanaan PHL wajib diisi.' },
        { status: 400 },
      )
    }

    if (action === 'add' && description.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Keterangan saldo PHL minimal 3 karakter.' },
        { status: 400 },
      )
    }

    if (reason.length < 5) {
      return NextResponse.json(
        { success: false, error: 'Alasan penyesuaian HR minimal 5 karakter.' },
        { status: 400 },
      )
    }

    if (files.length < 1 || files.length > MAX_FILES) {
      return NextResponse.json(
        {
          success: false,
          error: 'Evidence wajib minimal 1 file dan maksimal 3 file untuk satu penyesuaian PHL.',
        },
        { status: 400 },
      )
    }

    for (const file of files) {
      const validation = validateFile(file)
      if (validation) {
        return NextResponse.json({ success: false, error: validation }, { status: 400 })
      }
    }

    const { data: employee, error: employeeError } = await admin
      .from('employees')
      .select('id,employee_number,full_name')
      .eq('id', employeeId)
      .maybeSingle()

    if (employeeError || !employee) {
      return NextResponse.json(
        { success: false, error: 'Data karyawan tidak ditemukan.' },
        { status: 404 },
      )
    }

    // Idempotency: bila request sebelumnya sudah committed, jangan upload / adjust ulang.
    const { data: existingAdjustment, error: existingAdjustmentError } = await admin
      .from('phl_hr_adjustments')
      .select(
        'id,employee_id,action,days,phl_date,expired_at,balance_before,balance_after,description,reason,created_at',
      )
      .eq('request_key', requestKey)
      .maybeSingle()

    if (existingAdjustmentError) throw existingAdjustmentError

    if (existingAdjustment) {
      const { count } = await admin
        .from('harmony_request_attachments')
        .select('id', { count: 'exact', head: true })
        .eq('entity_type', 'phl_adjustment')
        .eq('entity_id', existingAdjustment.id)

      return NextResponse.json({
        success: true,
        duplicate_request: true,
        adjustment_id: existingAdjustment.id,
        employee_id: existingAdjustment.employee_id,
        action: existingAdjustment.action,
        days: existingAdjustment.days,
        phl_date: existingAdjustment.phl_date,
        expired_at: existingAdjustment.expired_at,
        balance_before: existingAdjustment.balance_before,
        balance_after: existingAdjustment.balance_after,
        description: existingAdjustment.description,
        reason: existingAdjustment.reason,
        evidence_count: Number(count || 0),
        message: 'Request sebelumnya sudah berhasil diproses. Saldo tidak diubah ulang.',
      })
    }

    const evidence: Array<Record<string, unknown>> = []

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]
      const slotNo = index + 1
      const storagePath = `phl_adjustment/${employeeId}/${requestKey}/${slotNo}-${crypto.randomUUID()}-${safeFileName(file.name)}`
      const buffer = Buffer.from(await file.arrayBuffer())

      const upload = await admin.storage.from(BUCKET).upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

      if (upload.error) {
        await cleanupFiles(admin, uploadedPaths)
        return NextResponse.json(
          { success: false, error: upload.error.message },
          { status: 500 },
        )
      }

      uploadedPaths.push(storagePath)

      const { data: publicUrlData } = admin.storage.from(BUCKET).getPublicUrl(storagePath)

      evidence.push({
        slot_no: slotNo,
        attachment_kind: 'hr_phl_manual_evidence',
        file_url: publicUrlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type || null,
        storage_bucket: BUCKET,
        storage_path: storagePath,
      })
    }

    const { data, error } = await user.rpc(
      'hr_adjust_employee_phl_balance_with_evidence_v1',
      {
        p_request_key: requestKey,
        p_employee_id: employeeId,
        p_action: action,
        p_days: days,
        p_phl_date: action === 'add' ? phlDate : null,
        p_description: description || null,
        p_reason: reason,
        p_actor_email: actorEmail,
        p_evidence: evidence,
      },
    )

    if (error) {
      await cleanupFiles(admin, uploadedPaths)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      )
    }

    const result = (data || {}) as Record<string, any>

    if (result.success === false) {
      await cleanupFiles(admin, uploadedPaths)
      return NextResponse.json(
        {
          success: false,
          error: result.message || 'Penyesuaian saldo PHL belum berhasil.',
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      ...result,
      success: true,
      evidence_count: Number(result.evidence_count || evidence.length),
    })
  } catch (error: any) {
    try {
      const authHeader = request.headers.get('authorization') || ''
      const token = authHeader.replace(/^Bearer\s+/i, '').trim()
      const clients = token ? getClients(token) : null
      if (clients) await cleanupFiles(clients.admin, uploadedPaths)
    } catch {
      // Best effort cleanup only.
    }

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Penyesuaian saldo PHL dengan evidence gagal diproses.',
      },
      { status: 500 },
    )
  }
}

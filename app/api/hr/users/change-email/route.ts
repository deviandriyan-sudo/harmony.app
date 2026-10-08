import { NextRequest, NextResponse } from 'next/server'

import {
  buildServerHarmonyEmailHtml,
  buildServerHarmonyEmailText,
  getNotificationEnvironmentStatus,
  sendHarmonyServerEmail,
} from '@/lib/notifications-server'
import {
  apiError,
  isValidEmail,
  normalizeEmail,
  requireHRApi,
} from '@/lib/server/hr-api-auth'

export const runtime = 'nodejs'

type AnyRow = Record<string, any>
type AuthUser = Record<string, any>

function clean(value: unknown) {
  return String(value || '').trim()
}

function unique(values: unknown[]) {
  return Array.from(new Set(values.map((value) => normalizeEmail(value)).filter(Boolean)))
}

async function listAuthUsers(admin: any) {
  const users: AuthUser[] = []
  const perPage = 200

  for (let page = 1; page <= 25; page += 1) {
    const result = await admin.auth.admin.listUsers({ page, perPage })
    if (result.error) throw result.error
    const batch = result.data?.users || []
    users.push(...batch)
    if (batch.length < perPage) break
  }

  return users
}

function metadataMatchesEmployee(user: AuthUser | null, employee: AnyRow | null, employeeId: string | null) {
  if (!user) return false
  const metadata = user.user_metadata || {}
  const metadataEmployeeId = clean(metadata.employee_id)
  const metadataEmployeeNumber = clean(metadata.employee_number).toLowerCase()
  const employeeNumber = clean(employee?.employee_number).toLowerCase()

  if (employeeId && metadataEmployeeId && metadataEmployeeId === employeeId) return true
  if (employeeNumber && metadataEmployeeNumber && metadataEmployeeNumber === employeeNumber) return true
  return false
}

function archiveEmailFor(id: string) {
  const suffix = clean(id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'user'
  return `harmony-archived-${Date.now()}-${suffix}@archive.invalid`
}

async function sendEmailChangeNotice({
  email,
  fullName,
  oldEmail,
  newEmail,
  recipientKind,
}: {
  email: string
  fullName: string
  oldEmail: string
  newEmail: string
  recipientKind: 'old' | 'new'
}) {
  try {
    const env = getNotificationEnvironmentStatus()
    if (!env.resendApiKeyConfigured || !env.fromConfigured || !isValidEmail(email)) {
      return { success: false, message: 'Email notifikasi tidak dikirim karena konfigurasi/alamat tidak valid.' }
    }

    const title = recipientKind === 'old'
      ? 'Email Login HARMONY Diubah'
      : 'Email Login HARMONY Diperbarui'

    const message = recipientKind === 'old'
      ? [
          `Yth. ${fullName || oldEmail},`,
          '',
          'Email login akun HARMONY Anda telah diubah oleh HR Administrator.',
          `Email lama: ${oldEmail}`,
          `Email baru: ${newEmail}`,
          '',
          'Jika Anda tidak mengetahui perubahan ini, segera hubungi HR Administrator.',
        ].join('\n')
      : [
          `Yth. ${fullName || newEmail},`,
          '',
          'Email login akun HARMONY Anda telah diperbarui oleh HR Administrator.',
          `Email login baru: ${newEmail}`,
          '',
          'Gunakan email baru tersebut untuk login berikutnya. Password akun tidak berubah.',
        ].join('\n')

    const result = await sendHarmonyServerEmail({
      to: email,
      subject: `[HARMONY] ${title}`,
      html: buildServerHarmonyEmailHtml({
        title,
        message,
        actionLabel: 'Buka HARMONY',
        actionUrl: `${env.appUrl}/login`,
        footer: 'Email ini dikirim otomatis oleh HARMONY.',
      }),
      text: buildServerHarmonyEmailText({
        title,
        message,
        actionLabel: 'Buka HARMONY',
        actionUrl: `${env.appUrl}/login`,
        footer: 'Email ini dikirim otomatis oleh HARMONY.',
      }),
    })

    return { success: result.ok, message: result.message }
  } catch (error: any) {
    return { success: false, message: error?.message || 'Notifikasi perubahan email gagal dikirim.' }
  }
}

function pickAppUser(rows: AnyRow[], userId: string, oldEmail: string) {
  if (userId) {
    const exact = rows.find((row) => clean(row.id) === userId)
    if (exact) return exact
  }
  if (oldEmail) {
    const byEmail = rows.find((row) => normalizeEmail(row.email) === oldEmail)
    if (byEmail) return byEmail
  }
  return rows.find((row) => row.is_active !== false) || rows[0] || null
}

export async function POST(request: NextRequest) {
  let stage = 'init'

  try {
    stage = 'authorize_hr'
    const { admin, actor, authUserId: actorAuthUserId } = await requireHRApi(request)
    const body = await request.json().catch(() => null)

    const userIdInput = clean(body?.user_id)
    const employeeIdInput = clean(body?.employee_id)
    const oldEmailInput = normalizeEmail(body?.old_email)
    const newEmail = normalizeEmail(body?.new_email)

    if (!isValidEmail(newEmail)) {
      return NextResponse.json(
        { message: 'Email baru wajib diisi dengan format yang valid.', stage: 'validate_email' },
        { status: 400 },
      )
    }

    stage = 'resolve_app_user'
    const appUserMap = new Map<string, AnyRow>()

    const collectAppUsers = async (query: any) => {
      const result = await query
      if (result.error) throw result.error
      for (const row of result.data || []) appUserMap.set(clean(row.id), row)
    }

    if (userIdInput) {
      await collectAppUsers(
        admin.from('app_users')
          .select('id,email,role,employee_id,is_active,created_at,updated_at')
          .eq('id', userIdInput)
          .limit(5),
      )
    }

    if (employeeIdInput) {
      await collectAppUsers(
        admin.from('app_users')
          .select('id,email,role,employee_id,is_active,created_at,updated_at')
          .eq('employee_id', employeeIdInput)
          .limit(50),
      )
    }

    if (oldEmailInput) {
      await collectAppUsers(
        admin.from('app_users')
          .select('id,email,role,employee_id,is_active,created_at,updated_at')
          .ilike('email', oldEmailInput)
          .limit(50),
      )
    }

    let appUser = pickAppUser([...appUserMap.values()], userIdInput, oldEmailInput)

    if (!appUser && employeeIdInput) {
      return NextResponse.json({
        success: true,
        account_found: false,
        unchanged: true,
        message: 'Employee belum mempunyai akun login HARMONY; hanya Employee Master yang perlu disimpan.',
      })
    }

    if (!appUser) {
      return NextResponse.json({ message: 'Akun HARMONY target tidak ditemukan.', stage }, { status: 404 })
    }

    let appUserId = clean(appUser.id)
    const employeeId = clean(appUser.employee_id || employeeIdInput) || null

    stage = 'resolve_employee'
    let employee: AnyRow | null = null
    if (employeeId) {
      const result = await admin
        .from('employees')
        .select('id,employee_number,full_name,email')
        .eq('id', employeeId)
        .limit(2)
      if (result.error) throw result.error
      employee = result.data?.[0] || null
    }

    stage = 'resolve_auth_user'
    const authUsers = await listAuthUsers(admin)
    const authById = authUsers.find((item) => clean(item.id) === appUserId) || null
    const appUserEmail = normalizeEmail(appUser.email)
    const authByAppEmail = appUserEmail
      ? authUsers.find((item) => normalizeEmail(item.email) === appUserEmail) || null
      : null
    const oldEmailCandidates = unique([appUser.email, oldEmailInput, employee?.email])
    const authByOldEmail = authUsers.find((item) => oldEmailCandidates.includes(normalizeEmail(item.email))) || null
    const metadataCandidates = authUsers.filter((item) => metadataMatchesEmployee(item, employee, employeeId))
    const authByNewEmail = authUsers.find((item) => normalizeEmail(item.email) === newEmail) || null

    let authUser: AuthUser | null = null

    // app_users adalah mapping akun HARMONY yang paling kuat. Prioritaskan ID/email row
    // ini sebelum Employee Master karena master email dapat sudah berubah sementara Auth masih lama.
    if (authById) authUser = authById
    if (!authUser && authByAppEmail) authUser = authByAppEmail
    if (!authUser && oldEmailInput && oldEmailInput !== newEmail) {
      authUser = authUsers.find((item) => normalizeEmail(item.email) === oldEmailInput) || null
    }
    if (!authUser && authByOldEmail) authUser = authByOldEmail
    if (!authUser && metadataCandidates.length === 1) authUser = metadataCandidates[0]
    if (!authUser && authByNewEmail && metadataMatchesEmployee(authByNewEmail, employee, employeeId)) {
      authUser = authByNewEmail
    }

    if (!authUser && metadataCandidates.length > 1) {
      return NextResponse.json({
        message: 'Ditemukan lebih dari satu Supabase Auth user yang mengarah ke karyawan yang sama. Rekonsiliasi dihentikan agar akun yang salah tidak diubah.',
        stage,
      }, { status: 409 })
    }

    if (!authUser) {
      return NextResponse.json({
        message: `Supabase Auth user target tidak ditemukan. Kandidat email: ${oldEmailCandidates.join(', ') || '-'}.`,
        stage,
      }, { status: 404 })
    }

    const authUserId = clean(authUser.id)
    const oldEmail = normalizeEmail(authUser.email || oldEmailInput || appUser.email || employee?.email)

    if (!isValidEmail(oldEmail)) {
      return NextResponse.json({
        message: 'Email login lama akun tidak dapat diidentifikasi dengan aman.',
        stage: 'resolve_old_email',
      }, { status: 409 })
    }

    // Bila ada app_users yang ID-nya sama dengan auth.users, prioritaskan row tersebut sebagai canonical.
    const canonicalAppRow = [...appUserMap.values()].find((row) => clean(row.id) === authUserId)
    if (canonicalAppRow) {
      appUser = canonicalAppRow
      appUserId = clean(canonicalAppRow.id)
    }

    stage = 'check_app_user_conflict'
    const appEmailResult = await admin
      .from('app_users')
      .select('id,email,employee_id,is_active')
      .ilike('email', newEmail)
      .limit(50)
    if (appEmailResult.error) throw appEmailResult.error

    const foreignAppConflict = (appEmailResult.data || []).find((row: AnyRow) => {
      if (clean(row.id) === appUserId) return false
      if (employeeId && clean(row.employee_id) === employeeId) return false
      return true
    })
    if (foreignAppConflict) {
      return NextResponse.json({
        message: 'Email baru sudah digunakan akun HARMONY milik karyawan lain.',
        stage,
      }, { status: 409 })
    }

    stage = 'check_employee_conflict'
    if (employeeId) {
      const employeeConflictResult = await admin
        .from('employees')
        .select('id,email,full_name')
        .ilike('email', newEmail)
        .limit(50)
      if (employeeConflictResult.error) throw employeeConflictResult.error
      const foreignEmployee = (employeeConflictResult.data || []).find((row: AnyRow) => clean(row.id) !== employeeId)
      if (foreignEmployee) {
        return NextResponse.json({
          message: `Email baru sudah digunakan karyawan lain${foreignEmployee.full_name ? ` (${foreignEmployee.full_name})` : ''}.`,
          stage,
        }, { status: 409 })
      }
    }

    stage = 'check_auth_conflict'
    if (authByNewEmail && clean(authByNewEmail.id) !== authUserId) {
      const duplicateAuthId = clean(authByNewEmail.id)
      const [duplicateAppResult, duplicateRemedResult] = await Promise.all([
        admin.from('app_users').select('id,email,employee_id,is_active').eq('id', duplicateAuthId).limit(20),
        admin.from('remed_user_access').select('id,auth_user_id,employee_id,email,is_active').eq('auth_user_id', duplicateAuthId).limit(20),
      ])
      if (duplicateAppResult.error) throw duplicateAppResult.error
      if (duplicateRemedResult.error) throw duplicateRemedResult.error

      const linkedEmployeeIds = [
        clean(authByNewEmail.user_metadata?.employee_id),
        ...(duplicateAppResult.data || []).map((row: AnyRow) => clean(row.employee_id)),
        ...(duplicateRemedResult.data || []).map((row: AnyRow) => clean(row.employee_id)),
      ].filter(Boolean)

      const sameEmployee = Boolean(employeeId) && linkedEmployeeIds.length > 0 && linkedEmployeeIds.every((id) => id === employeeId)

      if (!sameEmployee) {
        return NextResponse.json({
          message: 'Email baru sudah digunakan Supabase Auth user lain. Sistem tidak mengubah akun tersebut untuk mencegah salah kepemilikan.',
          stage,
        }, { status: 409 })
      }

      // Duplicate Auth yang terbukti terhubung ke employee yang sama diarsipkan.
      const archivedEmail = archiveEmailFor(duplicateAuthId)
      const archiveAuth = await admin.auth.admin.updateUserById(duplicateAuthId, {
        email: archivedEmail,
        email_confirm: true,
        user_metadata: {
          ...(authByNewEmail.user_metadata || {}),
          archived_by_harmony: true,
          archived_reason: 'duplicate_email_same_employee',
          archived_at: new Date().toISOString(),
        },
      })
      if (archiveAuth.error) throw archiveAuth.error

      for (const row of duplicateAppResult.data || []) {
        if (clean(row.id) === appUserId) continue
        const update = await admin
          .from('app_users')
          .update({ email: archiveEmailFor(clean(row.id)), is_active: false, updated_at: new Date().toISOString() })
          .eq('id', row.id)
        if (update.error) throw update.error
      }
    }

    stage = 'archive_same_employee_duplicate_app_rows'
    const sameEmployeeRows = employeeId
      ? [...appUserMap.values()].filter((row) => clean(row.employee_id) === employeeId)
      : [appUser]
    for (const row of sameEmployeeRows) {
      if (clean(row.id) === appUserId) continue
      const update = await admin
        .from('app_users')
        .update({ email: archiveEmailFor(clean(row.id)), is_active: false, updated_at: new Date().toISOString() })
        .eq('id', row.id)
      if (update.error) throw update.error
    }

    stage = 'load_remed_links'
    const remedCollections: AnyRow[][] = []
    const remedQueries = [
      admin.from('remed_user_access').select('id,auth_user_id,employee_id,email,role,is_active').eq('auth_user_id', authUserId),
      authUserId !== appUserId
        ? admin.from('remed_user_access').select('id,auth_user_id,employee_id,email,role,is_active').eq('auth_user_id', appUserId)
        : null,
      employeeId
        ? admin.from('remed_user_access').select('id,auth_user_id,employee_id,email,role,is_active').eq('employee_id', employeeId)
        : null,
      admin.from('remed_user_access').select('id,auth_user_id,employee_id,email,role,is_active').ilike('email', oldEmail),
      admin.from('remed_user_access').select('id,auth_user_id,employee_id,email,role,is_active').ilike('email', newEmail),
    ].filter(Boolean) as any[]

    for (const query of remedQueries) {
      const result = await query
      if (result.error) throw result.error
      remedCollections.push(result.data || [])
    }

    const remedRows = Array.from(
      new Map(remedCollections.flat().map((row: AnyRow) => [clean(row.id), row])).values(),
    ) as AnyRow[]

    const foreignRemed = remedRows.find((row) => {
      const rowEmployeeId = clean(row.employee_id)
      return normalizeEmail(row.email) === newEmail && rowEmployeeId && (!employeeId || rowEmployeeId !== employeeId)
    })
    if (foreignRemed) {
      return NextResponse.json({
        message: 'Email baru masih terhubung ke akses Re-Med milik karyawan lain.',
        stage: 'check_remed_conflict',
      }, { status: 409 })
    }

    const authAlreadyNew = normalizeEmail(authUser.email) === newEmail
    const appAlreadyNew = normalizeEmail(appUser.email) === newEmail
    const employeeAlreadyNew = !employeeId || normalizeEmail(employee?.email) === newEmail
    const remedAlreadyNew = remedRows.every((row) => {
      const belongsToTarget = employeeId
        ? clean(row.employee_id) === employeeId || clean(row.auth_user_id) === authUserId || clean(row.auth_user_id) === appUserId
        : clean(row.auth_user_id) === authUserId || clean(row.auth_user_id) === appUserId
      return !belongsToTarget || (normalizeEmail(row.email) === newEmail && clean(row.auth_user_id) === authUserId)
    })

    if (authAlreadyNew && appAlreadyNew && employeeAlreadyNew && remedAlreadyNew) {
      return NextResponse.json({
        success: true,
        account_found: true,
        unchanged: true,
        message: 'Email login dan seluruh data terkait sudah sinkron.',
        user: { ...appUser, email: newEmail },
      })
    }

    const now = new Date().toISOString()
    let authChanged = false
    let appChanged = false
    let employeeChanged = false
    const remedChanged: string[] = []

    try {
      stage = 'update_supabase_auth'
      if (!authAlreadyNew) {
        const authUpdate = await admin.auth.admin.updateUserById(authUserId, {
          email: newEmail,
          email_confirm: true,
          user_metadata: {
            ...(authUser.user_metadata || {}),
            employee_id: employeeId,
            employee_number: employee?.employee_number || authUser.user_metadata?.employee_number || null,
            full_name: employee?.full_name || authUser.user_metadata?.full_name || null,
            source: 'harmony_email_change_v3_4_4',
          },
        })
        if (authUpdate.error) throw authUpdate.error
        authChanged = true
      }

      stage = 'update_app_users'
      if (!appAlreadyNew) {
        const appUpdate = await admin.from('app_users').update({ email: newEmail, updated_at: now }).eq('id', appUserId)
        if (appUpdate.error) throw appUpdate.error
        appChanged = true
      }

      stage = 'update_employee_master'
      if (employeeId && !employeeAlreadyNew) {
        const employeeUpdate = await admin.from('employees').update({ email: newEmail, updated_at: now }).eq('id', employeeId)
        if (employeeUpdate.error) throw employeeUpdate.error
        employeeChanged = true
      }

      stage = 'update_remed_access'
      for (const row of remedRows) {
        const rowEmployeeId = clean(row.employee_id)
        const belongsToTarget = employeeId
          ? rowEmployeeId === employeeId || clean(row.auth_user_id) === authUserId || clean(row.auth_user_id) === appUserId || normalizeEmail(row.email) === oldEmail
          : clean(row.auth_user_id) === authUserId || clean(row.auth_user_id) === appUserId || normalizeEmail(row.email) === oldEmail
        if (!belongsToTarget) continue
        if (normalizeEmail(row.email) === newEmail && clean(row.auth_user_id) === authUserId) continue

        const remedUpdate = await admin
          .from('remed_user_access')
          .update({ email: newEmail, auth_user_id: authUserId, updated_at: now })
          .eq('id', row.id)
        if (remedUpdate.error) throw remedUpdate.error
        remedChanged.push(clean(row.id))
      }
    } catch (syncError) {
      // Best-effort rollback untuk target utama. Arsip duplicate yang telah dibuktikan stale tidak diaktifkan kembali.
      for (const row of remedRows.filter((item) => remedChanged.includes(clean(item.id)))) {
        try {
          await admin.from('remed_user_access')
            .update({ email: row.email, auth_user_id: row.auth_user_id, updated_at: new Date().toISOString() })
            .eq('id', row.id)
        } catch {}
      }
      if (employeeChanged && employeeId) {
        try {
          await admin.from('employees')
            .update({ email: employee?.email || oldEmail, updated_at: new Date().toISOString() })
            .eq('id', employeeId)
        } catch {}
      }
      if (appChanged) {
        try {
          await admin.from('app_users')
            .update({ email: appUser.email || oldEmail, updated_at: new Date().toISOString() })
            .eq('id', appUserId)
        } catch {}
      }
      if (authChanged) {
        try {
          await admin.auth.admin.updateUserById(authUserId, { email: oldEmail, email_confirm: true })
        } catch {}
      }
      throw syncError
    }

    stage = 'write_audit'
    let auditWarning = ''
    try {
      const audit = await admin.from('hr_setting_action_logs').insert({
        actor_user_id: actor.id,
        actor_email: actor.email,
        action_type: 'change_harmony_login_email',
        target_employee_id: employeeId,
        target_employee_number: employee?.employee_number || null,
        target_full_name: employee?.full_name || newEmail,
        metadata: {
          target_app_user_id: appUserId,
          target_auth_user_id: authUserId,
          legacy_uuid_mismatch: appUserId !== authUserId,
          old_email: oldEmail,
          new_email: newEmail,
          synced_app_users: true,
          synced_employee: Boolean(employeeId),
          synced_remed_access_count: remedChanged.length,
        },
      })
      if (audit.error) auditWarning = audit.error.message
    } catch (error: any) {
      auditWarning = error?.message || 'Audit log tidak dapat ditulis.'
    }

    stage = 'send_notifications'
    const fullName = employee?.full_name || newEmail
    const [oldNotice, newNotice] = await Promise.all([
      oldEmail && oldEmail !== newEmail
        ? sendEmailChangeNotice({ email: oldEmail, fullName, oldEmail, newEmail, recipientKind: 'old' })
        : Promise.resolve({ success: false, message: 'Email lama tidak tersedia.' }),
      sendEmailChangeNotice({ email: newEmail, fullName, oldEmail, newEmail, recipientKind: 'new' }),
    ])

    return NextResponse.json({
      success: true,
      account_found: true,
      unchanged: false,
      message: 'Email login berhasil direkonsiliasi dan disinkronkan ke Supabase Auth, HARMONY, Employee Master, dan Re-Med.',
      user: { ...appUser, email: newEmail },
      reconciled_legacy_uuid: appUserId !== authUserId,
      audit_warning: auditWarning || null,
      notification: {
        old_email: oldNotice,
        new_email: newNotice,
      },
      requires_relogin: authUserId === actorAuthUserId,
    })
  } catch (error) {
    const result = apiError(error, 'Gagal mengubah email login akun.')
    return NextResponse.json({
      message: `${result.message} [tahap: ${stage}]`,
      error: result.error,
      stage,
    }, { status: result.status })
  }
}

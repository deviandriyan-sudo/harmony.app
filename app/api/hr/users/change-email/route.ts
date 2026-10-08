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

async function findAuthUserByEmail(admin: any, email: string) {
  if (!email) return null
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (list.error) throw list.error
  return list.data.users.find((item: any) => normalizeEmail(item.email) === email) || null
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

export async function POST(request: NextRequest) {
  try {
    const { admin, actor, authUserId: actorAuthUserId } = await requireHRApi(request)
    const body = await request.json().catch(() => null)

    const userIdInput = String(body?.user_id || '').trim()
    const employeeIdInput = String(body?.employee_id || '').trim()
    const newEmail = normalizeEmail(body?.new_email)

    if (!isValidEmail(newEmail)) {
      return NextResponse.json({ message: 'Email baru wajib diisi dengan format yang valid.' }, { status: 400 })
    }

    let appUser: any = null

    if (userIdInput) {
      const result = await admin
        .from('app_users')
        .select('id,email,role,employee_id,is_active')
        .eq('id', userIdInput)
        .maybeSingle()
      if (result.error) throw result.error
      appUser = result.data
    }

    if (!appUser && employeeIdInput) {
      const result = await admin
        .from('app_users')
        .select('id,email,role,employee_id,is_active')
        .eq('employee_id', employeeIdInput)
        .maybeSingle()
      if (result.error) throw result.error
      appUser = result.data
    }

    // Employee Master tetap boleh mengubah email master ketika employee belum mempunyai akun login.
    if (!appUser && employeeIdInput) {
      return NextResponse.json({
        success: true,
        account_found: false,
        message: 'Employee belum mempunyai akun HARMONY; tidak ada email login yang perlu disinkronkan.',
      })
    }

    if (!appUser) {
      return NextResponse.json({ message: 'Akun HARMONY target tidak ditemukan.' }, { status: 404 })
    }

    const appUserId = String(appUser.id)
    const employeeId = String(appUser.employee_id || employeeIdInput || '').trim() || null

    let employee: any = null
    if (employeeId) {
      const result = await admin
        .from('employees')
        .select('id,employee_number,full_name,email')
        .eq('id', employeeId)
        .maybeSingle()
      if (result.error) throw result.error
      employee = result.data
    }

    const oldEmail = normalizeEmail(appUser.email || employee?.email)
    if (!oldEmail || !isValidEmail(oldEmail)) {
      return NextResponse.json({ message: 'Email login lama akun tidak valid. Sinkronisasi akun diperlukan.' }, { status: 409 })
    }

    if (oldEmail === newEmail) {
      return NextResponse.json({
        success: true,
        account_found: true,
        unchanged: true,
        message: 'Email login tidak berubah.',
        user: appUser,
      })
    }

    // Resolve Auth user secara toleran terhadap akun legacy yang app_users.id-nya tidak sama dengan auth.users.id.
    const authByIdResult = await admin.auth.admin.getUserById(appUserId)
    const authById = !authByIdResult.error ? authByIdResult.data?.user || null : null
    const authByEmail = await findAuthUserByEmail(admin, oldEmail)

    let authUser = authById
    if (authByEmail && (!authById || normalizeEmail(authById.email) !== oldEmail)) {
      authUser = authByEmail
    }

    if (!authUser) {
      return NextResponse.json({
        message: 'Supabase Auth user target tidak ditemukan berdasarkan UUID maupun email login lama.',
      }, { status: 404 })
    }

    const authUserId = String(authUser.id)

    const appConflict = await admin
      .from('app_users')
      .select('id,email')
      .ilike('email', newEmail)
      .neq('id', appUserId)
      .maybeSingle()
    if (appConflict.error) throw appConflict.error
    if (appConflict.data) {
      return NextResponse.json({ message: 'Email baru sudah digunakan akun HARMONY lain.' }, { status: 409 })
    }

    const authConflict = await findAuthUserByEmail(admin, newEmail)
    if (authConflict && String(authConflict.id) !== authUserId) {
      return NextResponse.json({ message: 'Email baru sudah digunakan Supabase Auth user lain.' }, { status: 409 })
    }

    if (employeeId) {
      const employeeConflict = await admin
        .from('employees')
        .select('id,email')
        .ilike('email', newEmail)
        .neq('id', employeeId)
        .maybeSingle()
      if (employeeConflict.error) throw employeeConflict.error
      if (employeeConflict.data) {
        return NextResponse.json({ message: 'Email baru sudah digunakan data karyawan lain.' }, { status: 409 })
      }
    }

    const remedConflict = await admin
      .from('remed_user_access')
      .select('id,auth_user_id,employee_id,email')
      .ilike('email', newEmail)
      .maybeSingle()
    if (remedConflict.error) throw remedConflict.error
    if (
      remedConflict.data &&
      String(remedConflict.data.auth_user_id || '') !== authUserId &&
      (!employeeId || String(remedConflict.data.employee_id || '') !== employeeId)
    ) {
      return NextResponse.json({ message: 'Email baru sudah digunakan akses Re-Med lain.' }, { status: 409 })
    }

    const remedRowsByAuthId = await admin
      .from('remed_user_access')
      .select('id,auth_user_id,employee_id,email,role,is_active')
      .eq('auth_user_id', authUserId)
    if (remedRowsByAuthId.error) throw remedRowsByAuthId.error

    const remedRowsByLegacyAppId = authUserId !== appUserId
      ? await admin
          .from('remed_user_access')
          .select('id,auth_user_id,employee_id,email,role,is_active')
          .eq('auth_user_id', appUserId)
      : { data: [], error: null }
    if (remedRowsByLegacyAppId.error) throw remedRowsByLegacyAppId.error

    const remedRowsByEmployee = employeeId
      ? await admin
          .from('remed_user_access')
          .select('id,auth_user_id,employee_id,email,role,is_active')
          .eq('employee_id', employeeId)
      : { data: [], error: null }
    if (remedRowsByEmployee.error) throw remedRowsByEmployee.error

    const remedRowsByEmail = await admin
      .from('remed_user_access')
      .select('id,auth_user_id,employee_id,email,role,is_active')
      .ilike('email', oldEmail)
    if (remedRowsByEmail.error) throw remedRowsByEmail.error

    const remedRows = Array.from(
      new Map(
        [
          ...(remedRowsByAuthId.data || []),
          ...(remedRowsByLegacyAppId.data || []),
          ...(remedRowsByEmployee.data || []),
          ...(remedRowsByEmail.data || []),
        ].map((row: any) => [row.id, row]),
      ).values(),
    ) as any[]

    const now = new Date().toISOString()
    let authChanged = false
    let appChanged = false
    let employeeChanged = false
    const remedChanged: string[] = []

    try {
      const authUpdate = await admin.auth.admin.updateUserById(authUserId, {
        email: newEmail,
        email_confirm: true,
        user_metadata: {
          ...(authUser.user_metadata || {}),
          employee_id: employeeId,
          employee_number: employee?.employee_number || authUser.user_metadata?.employee_number || null,
          full_name: employee?.full_name || authUser.user_metadata?.full_name || null,
          source: 'harmony_email_change_v3_4_1',
        },
      })
      if (authUpdate.error) throw authUpdate.error
      authChanged = true

      const appUpdate = await admin
        .from('app_users')
        .update({ email: newEmail, updated_at: now })
        .eq('id', appUserId)
      if (appUpdate.error) throw appUpdate.error
      appChanged = true

      if (employeeId) {
        const employeeUpdate = await admin
          .from('employees')
          .update({ email: newEmail, updated_at: now })
          .eq('id', employeeId)
        if (employeeUpdate.error) throw employeeUpdate.error
        employeeChanged = true
      }

      for (const row of remedRows) {
        const remedUpdate = await admin
          .from('remed_user_access')
          .update({ email: newEmail, auth_user_id: authUserId, updated_at: now })
          .eq('id', row.id)
        if (remedUpdate.error) throw remedUpdate.error
        remedChanged.push(row.id)
      }
    } catch (syncError) {
      // Best-effort rollback agar perubahan email tidak berhenti setengah jalan.
      for (const row of remedRows.filter((item) => remedChanged.includes(item.id))) {
        try {
          await admin
            .from('remed_user_access')
            .update({ email: row.email, auth_user_id: row.auth_user_id, updated_at: new Date().toISOString() })
            .eq('id', row.id)
        } catch {}
      }
      if (employeeChanged && employeeId) {
        try {
          await admin
            .from('employees')
            .update({ email: employee?.email || oldEmail, updated_at: new Date().toISOString() })
            .eq('id', employeeId)
        } catch {}
      }
      if (appChanged) {
        try {
          await admin
            .from('app_users')
            .update({ email: oldEmail, updated_at: new Date().toISOString() })
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
          synced_remed_access_count: remedRows.length,
        },
      })
      if (audit.error) auditWarning = audit.error.message
    } catch (error: any) {
      auditWarning = error?.message || 'Audit log tidak dapat ditulis.'
    }

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
      message: 'Email login berhasil diubah dan disinkronkan ke Supabase Auth, HARMONY, Employee Master, dan Re-Med.',
      user: {
        ...appUser,
        email: newEmail,
      },
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
    return NextResponse.json({ message: result.message, error: result.error }, { status: result.status })
  }
}

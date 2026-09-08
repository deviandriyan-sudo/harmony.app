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
  const listResult = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listResult.error) throw listResult.error
  return listResult.data.users.find(
    (user: any) => normalizeEmail(user.email) === email,
  ) || null
}

async function sendAccountNotification({
  email,
  fullName,
  actionLabel,
}: {
  email: string
  fullName: string
  actionLabel: string
}) {
  try {
    const env = getNotificationEnvironmentStatus()
    if (!env.resendApiKeyConfigured || !env.fromConfigured || !isValidEmail(email)) {
      return {
        success: false,
        message: 'Konfigurasi email belum lengkap/valid. Proses akun tetap berhasil.',
      }
    }

    const title = actionLabel
    const message = [
      `Yth. ${fullName || email},`,
      '',
      `${actionLabel} oleh HR Administrator.`,
      'Demi keamanan, password baru tidak dicantumkan di email ini.',
      'Silakan gunakan kredensial yang diberikan HR atau hubungi HR bila Anda tidak meminta perubahan ini.',
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
    return {
      success: false,
      message: error?.message || 'Email notifikasi gagal dikirim. Proses akun tetap berhasil.',
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { admin, actor } = await requireHRApi(request)
    const body = await request.json().catch(() => null)

    const requestedUserId = String(body?.app_user_id || body?.user_id || '').trim()
    const directExistingUserReset = Boolean(body?.user_id) && !body?.employee_id && !body?.app_user_id
    let employeeId = String(body?.employee_id || '').trim()
    const requestEmail = normalizeEmail(body?.email)
    const newPassword = String(body?.new_password || '')

    if (newPassword.length < 8) {
      return NextResponse.json(
        { message: 'Password baru minimal 8 karakter.', error: 'Password baru minimal 8 karakter.' },
        { status: 400 },
      )
    }

    let targetAppUser: any = null
    if (requestedUserId) {
      const byId = await admin
        .from('app_users')
        .select('*')
        .eq('id', requestedUserId)
        .maybeSingle()
      if (!byId.error && byId.data) targetAppUser = byId.data
    }

    // Mode A: request dari /hr/users mereset Auth user existing tanpa mengubah role/link employee.
    if (directExistingUserReset && targetAppUser) {
      const email = normalizeEmail(targetAppUser.email || requestEmail)
      const authById = await admin.auth.admin.getUserById(targetAppUser.id)
      let authUser = !authById.error ? authById.data?.user || null : null
      if (!authUser && email) authUser = await findAuthUserByEmail(admin, email)

      if (!authUser) {
        return NextResponse.json(
          { message: 'Supabase Auth user target tidak ditemukan.', error: 'Supabase Auth user target tidak ditemukan.' },
          { status: 404 },
        )
      }

      const update = await admin.auth.admin.updateUserById(authUser.id, { password: newPassword })
      if (update.error) throw update.error

      await admin.from('hr_setting_action_logs').insert({
        actor_user_id: actor.id,
        actor_email: actor.email,
        action_type: 'reset_user_password',
        target_employee_id: null,
        target_full_name: email || authUser.id,
        metadata: { target_user_id: authUser.id, target_email: email || null, source: 'hr_users_v8' },
      })

      const notification = email
        ? await sendAccountNotification({
            email,
            fullName: email,
            actionLabel: 'Password HARMONY Direset',
          })
        : { success: false, message: 'Email target tidak tersedia.' }

      return NextResponse.json({
        message: 'Password user berhasil direset.',
        created_account: false,
        synced_account: false,
        notification,
      })
    }

    if (!employeeId && targetAppUser?.employee_id) {
      employeeId = String(targetAppUser.employee_id)
    }

    // Mode B: create/sync/reset akun employee dari HR Settings.
    if (!employeeId) {
      return NextResponse.json(
        { message: 'Employee atau user target wajib diisi.', error: 'Employee atau user target wajib diisi.' },
        { status: 400 },
      )
    }

    const employeeResult = await admin
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .maybeSingle()

    if (employeeResult.error || !employeeResult.data) {
      return NextResponse.json(
        { message: 'Data karyawan tidak ditemukan pada employees.', error: 'Data karyawan tidak ditemukan pada employees.' },
        { status: 404 },
      )
    }

    const employee = employeeResult.data
    const employeeEmail = normalizeEmail(employee.email || requestEmail)
    if (!employeeEmail || !isValidEmail(employeeEmail)) {
      return NextResponse.json(
        {
          message: 'Email karyawan belum tersedia atau formatnya tidak valid.',
          error: 'Email karyawan belum tersedia atau formatnya tidak valid.',
        },
        { status: 400 },
      )
    }

    if (!targetAppUser) {
      const byEmployee = await admin
        .from('app_users')
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle()
      if (!byEmployee.error && byEmployee.data) targetAppUser = byEmployee.data
    }

    if (!targetAppUser) {
      const byEmail = await admin
        .from('app_users')
        .select('*')
        .ilike('email', employeeEmail)
        .maybeSingle()
      if (!byEmail.error && byEmail.data) targetAppUser = byEmail.data
    }

    let authUser: any = null
    if (targetAppUser?.id) {
      const authById = await admin.auth.admin.getUserById(targetAppUser.id)
      if (!authById.error && authById.data?.user) authUser = authById.data.user
    }
    if (!authUser) authUser = await findAuthUserByEmail(admin, employeeEmail)

    let createdAccount = false
    let syncedAccount = false

    if (!authUser) {
      const create = await admin.auth.admin.createUser({
        email: employeeEmail,
        password: newPassword,
        email_confirm: true,
        user_metadata: {
          employee_id: employeeId,
          employee_number: employee.employee_number || null,
          full_name: employee.full_name || null,
          source: 'harmony_hr_settings_v8',
        },
      })
      if (create.error || !create.data?.user) throw create.error || new Error('Supabase Auth user gagal dibuat.')
      authUser = create.data.user
      createdAccount = true
    } else {
      const update = await admin.auth.admin.updateUserById(authUser.id, {
        email: employeeEmail,
        password: newPassword,
        email_confirm: true,
        user_metadata: {
          ...(authUser.user_metadata || {}),
          employee_id: employeeId,
          employee_number: employee.employee_number || null,
          full_name: employee.full_name || null,
          source: 'harmony_hr_settings_v8',
        },
      })
      if (update.error) throw update.error
      authUser = update.data.user || authUser
    }

    if (targetAppUser && targetAppUser.id !== authUser.id) {
      return NextResponse.json(
        {
          message: 'Ditemukan konflik UUID antara app_users dan Supabase Auth. Rekonsiliasi akun diperlukan.',
          error: 'Ditemukan konflik UUID antara app_users dan Supabase Auth. Rekonsiliasi akun diperlukan.',
        },
        { status: 409 },
      )
    }

    const now = new Date().toISOString()
    const appUserPayload = {
      id: authUser.id,
      email: employeeEmail,
      role: 'employee',
      employee_id: employeeId,
      is_active: true,
      updated_at: now,
    }

    if (targetAppUser) {
      const updateApp = await admin.from('app_users').update(appUserPayload).eq('id', authUser.id)
      if (updateApp.error) throw updateApp.error
    } else {
      const insertApp = await admin.from('app_users').insert({ ...appUserPayload, created_at: now })
      if (insertApp.error) throw insertApp.error
      syncedAccount = !createdAccount
    }

    await admin
      .from('employees')
      .update({ email: employeeEmail, is_active: true, updated_at: now })
      .eq('id', employeeId)

    await admin.from('hr_setting_action_logs').insert({
      actor_user_id: actor.id,
      actor_email: actor.email,
      action_type: createdAccount
        ? 'create_employee_login_account'
        : syncedAccount
          ? 'sync_employee_login_account'
          : 'reset_employee_password',
      target_employee_id: employeeId,
      target_employee_number: employee.employee_number || null,
      target_full_name: employee.full_name || employeeEmail,
      metadata: {
        target_app_user_id: authUser.id,
        target_email: employeeEmail,
        source: 'hr_settings_v8',
        created_account: createdAccount,
        synced_account: syncedAccount,
      },
    })

    const notification = await sendAccountNotification({
      email: employeeEmail,
      fullName: employee.full_name || employeeEmail,
      actionLabel: createdAccount
        ? 'Akun HARMONY Dibuat'
        : syncedAccount
          ? 'Akun HARMONY Disinkronkan'
          : 'Password HARMONY Direset',
    })

    return NextResponse.json({
      message: createdAccount
        ? 'Akun login karyawan berhasil dibuat.'
        : syncedAccount
          ? 'Akun login karyawan berhasil disinkronkan.'
          : 'Password karyawan berhasil direset.',
      created_account: createdAccount,
      synced_account: syncedAccount,
      app_user_id: authUser.id,
      notification,
    })
  } catch (error) {
    const result = apiError(error, 'Gagal memproses akun/password.')
    return NextResponse.json({ message: result.message, error: result.error }, { status: result.status })
  }
}

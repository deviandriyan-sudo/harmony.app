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
    const { admin, actor } = await requireHRApi(request)
    const body = await request.json().catch(() => null)

    const userIdInput = String(body?.user_id || '').trim()
    const employeeIdInput = String(body?.employee_id || '').trim()
    const newEmail = normalizeEmail(body?.new_email)

    let appUser: any = null

    if (userIdInput) {
      const result = await admin
        .from('app_users')
        .select('id,email,role,employee_id,is_active')
        .eq('id', userIdInput)
        .maybeSingle()
      if (result.error) throw result.error
      appUser = result.data
    } else if (employeeIdInput) {
      const result = await admin
        .from('app_users')
        .select('id,email,role,employee_id,is_active')
        .eq('employee_id', employeeIdInput)
        .maybeSingle()
      if (result.error) throw result.error
      appUser = result.data
    }

    // Dipakai Employee Master: bila employee belum punya akun login, email master boleh tetap diedit biasa.
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

    if (!isValidEmail(newEmail)) {
      return NextResponse.json({ message: 'Email baru wajib diisi dengan format yang valid.' }, { status: 400 })
    }

    const userId = String(appUser.id)
    const oldEmail = normalizeEmail(appUser.email)
    const employeeId = String(appUser.employee_id || employeeIdInput || '').trim() || null

    if (oldEmail === newEmail) {
      return NextResponse.json({
        success: true,
        account_found: true,
        unchanged: true,
        message: 'Email login tidak berubah.',
        user: appUser,
      })
    }

    const appConflict = await admin
      .from('app_users')
      .select('id,email')
      .ilike('email', newEmail)
      .neq('id', userId)
      .maybeSingle()
    if (appConflict.error) throw appConflict.error
    if (appConflict.data) {
      return NextResponse.json({ message: 'Email baru sudah digunakan akun HARMONY lain.' }, { status: 409 })
    }

    const authConflict = await findAuthUserByEmail(admin, newEmail)
    if (authConflict && authConflict.id !== userId) {
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
      String(remedConflict.data.auth_user_id || '') !== userId &&
      (!employeeId || String(remedConflict.data.employee_id || '') !== employeeId)
    ) {
      return NextResponse.json({ message: 'Email baru sudah digunakan akses Re-Med lain.' }, { status: 409 })
    }

    const authById = await admin.auth.admin.getUserById(userId)
    let authUser = !authById.error ? authById.data?.user || null : null
    if (!authUser && oldEmail) authUser = await findAuthUserByEmail(admin, oldEmail)

    if (!authUser) {
      return NextResponse.json({ message: 'Supabase Auth user target tidak ditemukan.' }, { status: 404 })
    }
    if (authUser.id !== userId) {
      return NextResponse.json({ message: 'UUID app_users dan Supabase Auth tidak konsisten. Email tidak diubah.' }, { status: 409 })
    }

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

    const remedRowsById = await admin
      .from('remed_user_access')
      .select('id,auth_user_id,employee_id,email,role,is_active')
      .eq('auth_user_id', userId)
    if (remedRowsById.error) throw remedRowsById.error

    const remedRowsByEmployee = employeeId
      ? await admin
          .from('remed_user_access')
          .select('id,auth_user_id,employee_id,email,role,is_active')
          .eq('employee_id', employeeId)
      : { data: [], error: null }
    if (remedRowsByEmployee.error) throw remedRowsByEmployee.error

    const remedRowsByEmail = oldEmail
      ? await admin
          .from('remed_user_access')
          .select('id,auth_user_id,employee_id,email,role,is_active')
          .ilike('email', oldEmail)
      : { data: [], error: null }
    if (remedRowsByEmail.error) throw remedRowsByEmail.error

    const remedRows = Array.from(
      new Map(
        [
          ...(remedRowsById.data || []),
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
      const authUpdate = await admin.auth.admin.updateUserById(userId, {
        email: newEmail,
        email_confirm: true,
        user_metadata: {
          ...(authUser.user_metadata || {}),
          employee_id: employeeId,
          employee_number: employee?.employee_number || authUser.user_metadata?.employee_number || null,
          full_name: employee?.full_name || authUser.user_metadata?.full_name || null,
          source: 'harmony_email_change_v3_4',
        },
      })
      if (authUpdate.error) throw authUpdate.error
      authChanged = true

      const appUpdate = await admin
        .from('app_users')
        .update({ email: newEmail, updated_at: now })
        .eq('id', userId)
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
          .update({ email: newEmail, auth_user_id: userId, updated_at: now })
          .eq('id', row.id)
        if (remedUpdate.error) throw remedUpdate.error
        remedChanged.push(row.id)
      }
    } catch (syncError) {
      // Best-effort rollback agar email login tidak setengah sinkron.
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
            .update({ email: employee?.email || oldEmail || null, updated_at: new Date().toISOString() })
            .eq('id', employeeId)
        } catch {}
      }
      if (appChanged) {
        try {
          await admin
            .from('app_users')
            .update({ email: oldEmail, updated_at: new Date().toISOString() })
            .eq('id', userId)
        } catch {}
      }
      if (authChanged) {
        try {
          await admin.auth.admin.updateUserById(userId, { email: oldEmail, email_confirm: true })
        } catch {}
      }
      throw syncError
    }

    await admin.from('hr_setting_action_logs').insert({
      actor_user_id: actor.id,
      actor_email: actor.email,
      action_type: 'change_harmony_login_email',
      target_employee_id: employeeId,
      target_employee_number: employee?.employee_number || null,
      target_full_name: employee?.full_name || newEmail,
      metadata: {
        target_user_id: userId,
        old_email: oldEmail,
        new_email: newEmail,
        synced_app_users: true,
        synced_employee: Boolean(employeeId),
        synced_remed_access_count: remedRows.length,
      },
    })

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
      message: 'Email login berhasil diubah dan disinkronkan ke HARMONY, Employee Master, Supabase Auth, dan Re-Med.',
      user: {
        ...appUser,
        email: newEmail,
      },
      notification: {
        old_email: oldNotice,
        new_email: newNotice,
      },
      requires_relogin: userId === actor.id,
    })
  } catch (error) {
    const result = apiError(error, 'Gagal mengubah email login akun.')
    return NextResponse.json({ message: result.message, error: result.error }, { status: result.status })
  }
}

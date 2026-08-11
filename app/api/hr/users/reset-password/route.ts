import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import {
  buildServerHarmonyEmailHtml,
  buildServerHarmonyEmailText,
  getNotificationEnvironmentStatus,
  sendHarmonyServerEmail,
} from '@/lib/notifications-server'

export const runtime = 'nodejs'

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function normalizeRole(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            'Supabase server env belum lengkap. Pastikan NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY sudah ada di .env.local dan Vercel.',
        },
        { status: 500 }
      )
    }

    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '').trim()

    if (!token) {
      return NextResponse.json(
        { error: 'Token HR tidak ditemukan.' },
        { status: 401 }
      )
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // ----------------------------------------------------------------
    // 1. Validasi actor HR
    // ----------------------------------------------------------------
    const { data: authUserData, error: authUserError } =
      await admin.auth.getUser(token)

    if (authUserError || !authUserData.user) {
      return NextResponse.json(
        { error: 'Session HR tidak valid.' },
        { status: 401 }
      )
    }

    let actorAppUser: any = null

    const actorById = await admin
      .from('app_users')
      .select('*')
      .eq('id', authUserData.user.id)
      .maybeSingle()

    if (!actorById.error && actorById.data) {
      actorAppUser = actorById.data
    } else if (authUserData.user.email) {
      const actorByEmail = await admin
        .from('app_users')
        .select('*')
        .eq('email', normalizeEmail(authUserData.user.email))
        .maybeSingle()

      if (!actorByEmail.error) {
        actorAppUser = actorByEmail.data
      }
    }

    const actorRole = normalizeRole(actorAppUser?.role)

    if (
      !actorAppUser ||
      actorAppUser.is_active === false ||
      !['hr', 'admin', 'administrator', 'super_admin'].includes(actorRole)
    ) {
      return NextResponse.json(
        {
          error:
            'Akun ini tidak memiliki akses membuat atau reset akun login karyawan.',
        },
        { status: 403 }
      )
    }

    // ----------------------------------------------------------------
    // 2. Request
    // ----------------------------------------------------------------
    const body = await request.json().catch(() => null)

    const requestedAppUserId = String(body?.app_user_id || '').trim()
    const employeeId = String(body?.employee_id || '').trim()
    const requestEmail = normalizeEmail(body?.email)
    const newPassword = String(body?.new_password || '')

    if (!employeeId || !newPassword) {
      return NextResponse.json(
        { error: 'Employee dan password wajib diisi.' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password baru minimal 8 karakter.' },
        { status: 400 }
      )
    }

    // ----------------------------------------------------------------
    // 3. Employee master adalah sumber identitas utama
    // ----------------------------------------------------------------
    const { data: targetEmployee, error: employeeError } = await admin
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .maybeSingle()

    if (employeeError || !targetEmployee) {
      return NextResponse.json(
        { error: 'Data karyawan tidak ditemukan pada employees.' },
        { status: 404 }
      )
    }

    const employeeEmail = normalizeEmail(
      targetEmployee.email || requestEmail
    )

    if (!employeeEmail || !isValidEmail(employeeEmail)) {
      return NextResponse.json(
        {
          error:
            'Email karyawan belum tersedia atau formatnya tidak valid. Isi email karyawan terlebih dahulu.',
        },
        { status: 400 }
      )
    }

    // ----------------------------------------------------------------
    // 4. Cari app_users existing berdasarkan employee_id, id, atau email
    // ----------------------------------------------------------------
    let targetAppUser: any = null

    const byEmployee = await admin
      .from('app_users')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle()

    if (!byEmployee.error && byEmployee.data) {
      targetAppUser = byEmployee.data
    }

    if (!targetAppUser && requestedAppUserId) {
      const byId = await admin
        .from('app_users')
        .select('*')
        .eq('id', requestedAppUserId)
        .maybeSingle()

      if (!byId.error && byId.data) {
        targetAppUser = byId.data
      }
    }

    if (!targetAppUser) {
      const byEmail = await admin
        .from('app_users')
        .select('*')
        .eq('email', employeeEmail)
        .maybeSingle()

      if (!byEmail.error && byEmail.data) {
        targetAppUser = byEmail.data
      }
    }

    // ----------------------------------------------------------------
    // 5. Cari Supabase Auth user berdasarkan app_user id / email
    // ----------------------------------------------------------------
    let authTarget: any = null

    if (targetAppUser?.id) {
      const authById = await admin.auth.admin.getUserById(targetAppUser.id)

      if (!authById.error && authById.data?.user) {
        authTarget = authById.data.user
      }
    }

    if (!authTarget) {
      // Project HARMONY memiliki user relatif sedikit.
      // 1000 cukup untuk pencarian email tanpa loop yang kompleks.
      const listResult = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      })

      if (listResult.error) {
        return NextResponse.json(
          {
            error:
              listResult.error.message ||
              'Gagal membaca daftar Supabase Auth user.',
          },
          { status: 500 }
        )
      }

      authTarget =
        listResult.data.users.find(
          (user) => normalizeEmail(user.email) === employeeEmail
        ) || null
    }

    let createdAccount = false
    let syncedAccount = false

    // ----------------------------------------------------------------
    // 6. Kalau Auth belum ada -> buat
    // ----------------------------------------------------------------
    if (!authTarget) {
      const createResult = await admin.auth.admin.createUser({
        email: employeeEmail,
        password: newPassword,
        email_confirm: true,
        user_metadata: {
          employee_id: employeeId,
          employee_number: targetEmployee.employee_number || null,
          full_name: targetEmployee.full_name || null,
          source: 'harmony_hr_settings',
        },
      })

      if (createResult.error || !createResult.data?.user) {
        return NextResponse.json(
          {
            error:
              createResult.error?.message ||
              'Gagal membuat Supabase Auth user karyawan.',
          },
          { status: 500 }
        )
      }

      authTarget = createResult.data.user
      createdAccount = true
    } else {
      // Auth ada -> pastikan email/password/metadata tersinkron
      const updateAuthResult = await admin.auth.admin.updateUserById(
        authTarget.id,
        {
          email: employeeEmail,
          password: newPassword,
          email_confirm: true,
          user_metadata: {
            ...(authTarget.user_metadata || {}),
            employee_id: employeeId,
            employee_number: targetEmployee.employee_number || null,
            full_name: targetEmployee.full_name || null,
            source: 'harmony_hr_settings',
          },
        }
      )

      if (updateAuthResult.error) {
        return NextResponse.json(
          { error: updateAuthResult.error.message },
          { status: 500 }
        )
      }

      authTarget = updateAuthResult.data.user || authTarget
    }

    // ----------------------------------------------------------------
    // 7. Sinkronkan app_users dengan UUID Auth canonical
    // ----------------------------------------------------------------
    const now = new Date().toISOString()
    const canonicalAuthId = authTarget.id

    if (targetAppUser && targetAppUser.id !== canonicalAuthId) {
      // Kondisi tidak normal: app_users lama menunjuk UUID berbeda.
      // Jangan menimpa diam-diam karena bisa merusak relasi.
      return NextResponse.json(
        {
          error:
            'Ditemukan konflik UUID antara app_users dan Supabase Auth. Hubungi admin untuk rekonsiliasi akun sebelum melanjutkan.',
        },
        { status: 409 }
      )
    }

    const appUserPayload = {
      id: canonicalAuthId,
      email: employeeEmail,
      role: 'employee',
      employee_id: employeeId,
      is_active: true,
      updated_at: now,
    }

    if (targetAppUser) {
      const updateAppUser = await admin
        .from('app_users')
        .update(appUserPayload)
        .eq('id', canonicalAuthId)

      if (updateAppUser.error) {
        return NextResponse.json(
          {
            error:
              `Supabase Auth berhasil diproses tetapi app_users gagal disinkronkan: ${updateAppUser.error.message}`,
          },
          { status: 500 }
        )
      }
    } else {
      const insertAppUser = await admin
        .from('app_users')
        .insert({
          ...appUserPayload,
          created_at: now,
        })

      if (insertAppUser.error) {
        return NextResponse.json(
          {
            error:
              `Supabase Auth berhasil dibuat/ditemukan tetapi app_users gagal dibuat: ${insertAppUser.error.message}`,
          },
          { status: 500 }
        )
      }

      syncedAccount = !createdAccount
    }

    // Pastikan employee tetap aktif saat akun dibuat/reset.
    await admin
      .from('employees')
      .update({
        email: employeeEmail,
        is_active: true,
        updated_at: now,
      })
      .eq('id', employeeId)

    // ----------------------------------------------------------------
    // 8. Audit
    // ----------------------------------------------------------------
    await admin
      .from('hr_setting_action_logs')
      .insert({
        actor_user_id: actorAppUser.id,
        actor_email: actorAppUser.email,
        action_type: createdAccount
          ? 'create_employee_login_account'
          : syncedAccount
            ? 'sync_employee_login_account'
            : 'reset_employee_password',
        target_employee_id: employeeId,
        target_employee_number:
          targetEmployee.employee_number || null,
        target_full_name:
          targetEmployee.full_name || employeeEmail,
        metadata: {
          target_app_user_id: canonicalAuthId,
          target_email: employeeEmail,
          source: 'hr_settings',
          created_account: createdAccount,
          synced_account: syncedAccount,
        },
      })

    // ----------------------------------------------------------------
    // 9. Email notification
    // Email gagal TIDAK membatalkan create/sync/reset account.
    // Password plaintext sengaja tidak dikirim melalui email.
    // ----------------------------------------------------------------
    const notificationEnv =
      getNotificationEnvironmentStatus()

    const accountActionLabel = createdAccount
      ? 'Akun HARMONY Dibuat'
      : syncedAccount
        ? 'Akun HARMONY Disinkronkan'
        : 'Password HARMONY Direset'

    const notificationMessage = [
      `Yth. ${targetEmployee.full_name || employeeEmail},`,
      '',
      createdAccount
        ? 'Akun login HARMONY Anda telah dibuat dan diaktifkan oleh HR.'
        : syncedAccount
          ? 'Akun login HARMONY Anda telah disinkronkan dan diaktifkan oleh HR.'
          : 'Password login HARMONY Anda telah direset oleh HR.',
      '',
      `Username: ${employeeEmail}`,
      `Status akses: Aktif`,
      '',
      createdAccount || syncedAccount
        ? 'Password sementara telah ditetapkan oleh HR. Demi keamanan, password tidak ditampilkan pada email ini.'
        : 'Gunakan password baru yang telah diinformasikan oleh HR.',
      'Anda juga dapat menggunakan menu Masuk dengan Google apabila email Google kantor sama dengan email yang terdaftar di HARMONY.',
      '',
      'Jika Anda tidak mengenali perubahan ini, segera hubungi HR/PSDM.',
    ].join('\n')

    const notificationResult =
      await sendHarmonyServerEmail({
        to: employeeEmail,
        subject: `[HARMONY] ${accountActionLabel}`,
        html: buildServerHarmonyEmailHtml({
          title: accountActionLabel,
          message: notificationMessage,
          actionLabel: 'Buka HARMONY',
          actionUrl: `${notificationEnv.appUrl}/login`,
          footer:
            'Email ini dikirim otomatis oleh HARMONY setelah HR memproses akun login.',
        }),
        text: buildServerHarmonyEmailText({
          title: accountActionLabel,
          message: notificationMessage,
          actionLabel: 'Buka HARMONY',
          actionUrl: `${notificationEnv.appUrl}/login`,
          footer:
            'Email ini dikirim otomatis oleh HARMONY setelah HR memproses akun login.',
        }),
      })

    return NextResponse.json({
      success: true,
      created_account: createdAccount,
      synced_account: syncedAccount,
      app_user: {
        id: canonicalAuthId,
        email: employeeEmail,
        role: 'employee',
        employee_id: employeeId,
        is_active: true,
      },
      notification: {
        success: notificationResult.ok,
        message: notificationResult.message,
        provider_id: notificationResult.providerId || null,
      },
      message: createdAccount
        ? 'Akun login dan password karyawan berhasil dibuat.'
        : syncedAccount
          ? 'Akun login berhasil disinkronkan dan password berhasil ditetapkan.'
          : 'Password karyawan berhasil direset.',
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          'Terjadi kesalahan saat membuat/sinkronkan/reset akun karyawan.',
      },
      { status: 500 }
    )
  }
}
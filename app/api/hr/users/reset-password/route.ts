import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          error: 'Supabase server env belum lengkap. Pastikan NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY sudah ada.',
        },
        { status: 500 }
      )
    }

    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '').trim()

    if (!token) {
      return NextResponse.json(
        {
          error: 'Token HR tidak ditemukan.',
        },
        { status: 401 }
      )
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: authUserData, error: authUserError } = await admin.auth.getUser(token)

    if (authUserError || !authUserData.user) {
      return NextResponse.json(
        {
          error: 'Session HR tidak valid.',
        },
        { status: 401 }
      )
    }

    const { data: actorAppUser, error: actorError } = await admin
      .from('app_users')
      .select('*')
      .eq('id', authUserData.user.id)
      .maybeSingle()

    if (actorError || !actorAppUser || actorAppUser.role !== 'hr' || actorAppUser.is_active === false) {
      return NextResponse.json(
        {
          error: 'Akun ini tidak memiliki akses reset password karyawan.',
        },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => null)

    const appUserId = String(body?.app_user_id || '').trim()
    const employeeId = String(body?.employee_id || '').trim()
    const newPassword = String(body?.new_password || '')

    if (!appUserId || !employeeId || !newPassword) {
      return NextResponse.json(
        {
          error: 'Data reset password belum lengkap.',
        },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          error: 'Password baru minimal 8 karakter.',
        },
        { status: 400 }
      )
    }

    const { data: targetAppUser, error: targetAppUserError } = await admin
      .from('app_users')
      .select('*')
      .eq('id', appUserId)
      .eq('employee_id', employeeId)
      .maybeSingle()

    if (targetAppUserError || !targetAppUser) {
      return NextResponse.json(
        {
          error: 'Akun app_users karyawan tidak ditemukan atau tidak sesuai employee.',
        },
        { status: 404 }
      )
    }

    const { data: targetEmployee } = await admin
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .maybeSingle()

    const { error: updateError } = await admin.auth.admin.updateUserById(appUserId, {
      password: newPassword,
    })

    if (updateError) {
      return NextResponse.json(
        {
          error: updateError.message,
        },
        { status: 500 }
      )
    }

    await admin
      .from('hr_setting_action_logs')
      .insert({
        actor_user_id: actorAppUser.id,
        actor_email: actorAppUser.email,
        action_type: 'reset_employee_password',
        target_employee_id: employeeId,
        target_employee_number: targetEmployee?.employee_number || null,
        target_full_name: targetEmployee?.full_name || targetAppUser.email || null,
        metadata: {
          target_app_user_id: appUserId,
          target_email: targetAppUser.email,
          source: 'hr_settings',
        },
      })

    return NextResponse.json({
      success: true,
      message: 'Password karyawan berhasil direset.',
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || 'Terjadi kesalahan saat reset password.',
      },
      { status: 500 }
    )
  }
}

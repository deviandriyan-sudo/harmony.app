import { NextRequest, NextResponse } from 'next/server'
import { requireRemedApi, remedApiError } from '@/lib/server/remed-api-auth'
import { normalizeRemedRole } from '@/lib/remed'
import {
  buildServerHarmonyEmailHtml,
  buildServerHarmonyEmailText,
  getNotificationEnvironmentStatus,
  sendHarmonyServerEmail,
} from '@/lib/notifications-server'

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireRemedApi(request, ['hr'])
    const { data, error } = await ctx.admin
      .from('remed_user_access')
      .select('id,auth_user_id,employee_id,email,role,is_active,created_at,updated_at')
      .order('role', { ascending: true })
      .order('email', { ascending: true })
    if (error) throw error

    return NextResponse.json({ access: data || [] })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireRemedApi(request, ['hr'])
    const body = await request.json()
    const email = String(body?.email || '').trim().toLowerCase()
    const role = normalizeRemedRole(body?.role)
    const password = String(body?.password || '')
    const isActive = body?.is_active !== false

    if (!email || !role) throw Object.assign(new Error('Email dan role Re-Med wajib diisi.'), { status: 400 })

    const { data: existing, error: existingError } = await ctx.admin
      .from('remed_user_access')
      .select('id,auth_user_id,employee_id,email,role,is_active')
      .ilike('email', email)
      .maybeSingle()
    if (existingError) throw existingError

    const employeeIdWasProvided = Object.prototype.hasOwnProperty.call(body || {}, 'employee_id')
    const employeeId = employeeIdWasProvided
      ? String(body?.employee_id || '').trim() || null
      : existing?.employee_id || null

    if (role === 'employee' && !employeeId) {
      throw Object.assign(
        new Error('Akses Employee Re-Med wajib terhubung ke master employee HARMONY.'),
        { status: 400 },
      )
    }

    if (employeeId) {
      const { data: employee, error: employeeError } = await ctx.admin
        .from('employees')
        .select('id')
        .eq('id', employeeId)
        .maybeSingle()
      if (employeeError) throw employeeError
      if (!employee) throw Object.assign(new Error('Employee HARMONY tidak ditemukan.'), { status: 400 })
    }

    let authUserId = existing?.auth_user_id || null

    if (!authUserId && password) {
      if (password.length < 8) throw Object.assign(new Error('Password awal minimal 8 karakter.'), { status: 400 })
      const { data: authCreated, error: authError } = await ctx.admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (authError || !authCreated.user) {
        throw Object.assign(new Error(authError?.message || 'Gagal membuat akun Auth.'), { status: 400 })
      }
      authUserId = authCreated.user.id
    }

    const payload = {
      auth_user_id: authUserId,
      employee_id: employeeId,
      email,
      role,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    }

    let accessId = existing?.id || null

    if (existing?.id) {
      const { error } = await ctx.admin.from('remed_user_access').update(payload).eq('id', existing.id)
      if (error) throw error
    } else {
      const { data: inserted, error } = await ctx.admin
        .from('remed_user_access')
        .insert(payload)
        .select('id')
        .single()
      if (error) throw error
      accessId = inserted.id
    }

    await ctx.admin.rpc('remed_write_audit_v1', {
      p_actor_auth_user_id: ctx.authUserId,
      p_actor_email: ctx.access.email,
      p_actor_role: ctx.access.role,
      p_action: 'access_upserted',
      p_entity_type: 'remed_user_access',
      p_entity_id: accessId,
      p_metadata: { email, role, employee_id: employeeId, is_active: isActive },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}

function isValidAccessEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

async function sendAccessEmailChangeNotice({
  email,
  oldEmail,
  newEmail,
  isOld,
}: {
  email: string
  oldEmail: string
  newEmail: string
  isOld: boolean
}) {
  try {
    const env = getNotificationEnvironmentStatus()
    if (!env.resendApiKeyConfigured || !env.fromConfigured || !isValidAccessEmail(email)) {
      return { success: false, message: 'Notifikasi email tidak tersedia.' }
    }

    const title = isOld ? 'Email Login Re-Med Diubah' : 'Email Login Re-Med Diperbarui'
    const message = isOld
      ? `Email login Re-Med/HARMONY Anda diubah dari ${oldEmail} menjadi ${newEmail}. Jika Anda tidak mengetahui perubahan ini, segera hubungi HR.`
      : `Email login Re-Med/HARMONY Anda sekarang ${newEmail}. Password akun tidak berubah.`

    const result = await sendHarmonyServerEmail({
      to: email,
      subject: `[HARMONY Re-Med] ${title}`,
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

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await requireRemedApi(request, ['hr'])
    const body = await request.json().catch(() => null)
    const accessId = String(body?.access_id || '').trim()
    const newEmail = String(body?.new_email || '').trim().toLowerCase()

    if (!accessId) throw Object.assign(new Error('Access ID wajib diisi.'), { status: 400 })
    if (!isValidAccessEmail(newEmail)) throw Object.assign(new Error('Email baru tidak valid.'), { status: 400 })

    const currentResult = await ctx.admin
      .from('remed_user_access')
      .select('id,auth_user_id,employee_id,email,role,is_active')
      .eq('id', accessId)
      .maybeSingle()
    if (currentResult.error) throw currentResult.error
    if (!currentResult.data) throw Object.assign(new Error('Akses Re-Med tidak ditemukan.'), { status: 404 })

    const current = currentResult.data
    const oldEmail = String(current.email || '').trim().toLowerCase()
    if (oldEmail === newEmail) return NextResponse.json({ success: true, message: 'Email tidak berubah.' })

    const conflict = await ctx.admin
      .from('remed_user_access')
      .select('id,email')
      .ilike('email', newEmail)
      .neq('id', accessId)
      .maybeSingle()
    if (conflict.error) throw conflict.error
    if (conflict.data) throw Object.assign(new Error('Email baru sudah digunakan akses Re-Med lain.'), { status: 409 })

    let authUser: any = null
    if (current.auth_user_id) {
      const byId = await ctx.admin.auth.admin.getUserById(current.auth_user_id)
      if (byId.error || !byId.data?.user) {
        throw Object.assign(new Error('Supabase Auth user untuk akses ini tidak ditemukan.'), { status: 404 })
      }
      authUser = byId.data.user

      const list = await ctx.admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (list.error) throw list.error
      const authConflict = list.data.users.find(
        (user: any) => String(user.email || '').trim().toLowerCase() === newEmail && user.id !== current.auth_user_id,
      )
      if (authConflict) throw Object.assign(new Error('Email baru sudah digunakan Supabase Auth user lain.'), { status: 409 })
    }

    const now = new Date().toISOString()
    let authChanged = false
    let appChanged = false
    let employeeChanged = false

    try {
      if (current.auth_user_id && authUser) {
        const updateAuth = await ctx.admin.auth.admin.updateUserById(current.auth_user_id, {
          email: newEmail,
          email_confirm: true,
          user_metadata: {
            ...(authUser.user_metadata || {}),
            source: 'harmony_remed_email_change_v3_4',
          },
        })
        if (updateAuth.error) throw updateAuth.error
        authChanged = true

        const appUpdate = await ctx.admin
          .from('app_users')
          .update({ email: newEmail, updated_at: now })
          .eq('id', current.auth_user_id)
        if (appUpdate.error) throw appUpdate.error
        appChanged = true
      }

      if (current.employee_id) {
        const employeeUpdate = await ctx.admin
          .from('employees')
          .update({ email: newEmail, updated_at: now })
          .eq('id', current.employee_id)
        if (employeeUpdate.error) throw employeeUpdate.error
        employeeChanged = true
      }

      const accessUpdate = await ctx.admin
        .from('remed_user_access')
        .update({ email: newEmail, updated_at: now })
        .eq('id', accessId)
      if (accessUpdate.error) throw accessUpdate.error
    } catch (error) {
      try {
        await ctx.admin.from('remed_user_access').update({ email: oldEmail, updated_at: new Date().toISOString() }).eq('id', accessId)
      } catch {}
      if (employeeChanged && current.employee_id) {
        try {
          await ctx.admin.from('employees').update({ email: oldEmail, updated_at: new Date().toISOString() }).eq('id', current.employee_id)
        } catch {}
      }
      if (appChanged && current.auth_user_id) {
        try {
          await ctx.admin.from('app_users').update({ email: oldEmail, updated_at: new Date().toISOString() }).eq('id', current.auth_user_id)
        } catch {}
      }
      if (authChanged && current.auth_user_id) {
        try {
          await ctx.admin.auth.admin.updateUserById(current.auth_user_id, { email: oldEmail, email_confirm: true })
        } catch {}
      }
      throw error
    }

    await ctx.admin.rpc('remed_write_audit_v1', {
      p_actor_auth_user_id: ctx.authUserId,
      p_actor_email: ctx.access.email,
      p_actor_role: ctx.access.role,
      p_action: 'access_email_changed',
      p_entity_type: 'remed_user_access',
      p_entity_id: accessId,
      p_metadata: { old_email: oldEmail, new_email: newEmail, role: current.role },
    })

    const [oldNotice, newNotice] = await Promise.all([
      oldEmail ? sendAccessEmailChangeNotice({ email: oldEmail, oldEmail, newEmail, isOld: true }) : Promise.resolve({ success: false, message: 'Email lama tidak tersedia.' }),
      sendAccessEmailChangeNotice({ email: newEmail, oldEmail, newEmail, isOld: false }),
    ])

    return NextResponse.json({
      success: true,
      message: 'Email akses Re-Med berhasil diubah dan disinkronkan.',
      notification: { old_email: oldNotice, new_email: newNotice },
    })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { requireRemedApi, remedApiError } from '@/lib/server/remed-api-auth'
import { normalizeRemedRole } from '@/lib/remed'

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

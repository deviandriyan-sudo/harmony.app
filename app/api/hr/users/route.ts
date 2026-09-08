import { NextRequest, NextResponse } from 'next/server'

import {
  apiError,
  isAllowedManagedRole,
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

async function writeAudit(admin: any, actor: any, payload: Record<string, unknown>) {
  await admin.from('hr_setting_action_logs').insert({
    actor_user_id: actor.id,
    actor_email: actor.email,
    ...payload,
  })
}

export async function GET(request: NextRequest) {
  try {
    const { admin } = await requireHRApi(request)

    const usersResult = await admin
      .from('app_users')
      .select('id,email,role,employee_id,is_active,created_at,updated_at')
      .order('created_at', { ascending: false })

    if (usersResult.error) throw usersResult.error

    const users = usersResult.data || []
    const employeeIds = [...new Set(users.map((item: any) => item.employee_id).filter(Boolean))]
    const employeesById = new Map<string, any>()

    if (employeeIds.length > 0) {
      const employeesResult = await admin
        .from('employees')
        .select('id,employee_number,full_name,email,department,position,machine_pin')
        .in('id', employeeIds)

      if (!employeesResult.error) {
        for (const employee of employeesResult.data || []) {
          employeesById.set(employee.id, employee)
        }
      }
    }

    return NextResponse.json({
      users: users.map((user: any) => ({
        ...user,
        employees: user.employee_id ? employeesById.get(user.employee_id) || null : null,
      })),
    })
  } catch (error) {
    const result = apiError(error, 'Gagal memuat daftar user.')
    return NextResponse.json({ message: result.message, error: result.error }, { status: result.status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { admin, actor } = await requireHRApi(request)
    const body = await request.json().catch(() => null)

    const email = normalizeEmail(body?.email)
    const password = String(body?.password || '')
    const role = String(body?.role || 'employee').trim().toLowerCase()
    const employeeId = String(body?.employee_id || '').trim() || null

    if (!isValidEmail(email)) {
      return NextResponse.json({ message: 'Email wajib diisi dengan format yang valid.' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ message: 'Password minimal 8 karakter.' }, { status: 400 })
    }
    if (!isAllowedManagedRole(role)) {
      return NextResponse.json({ message: 'Role hanya boleh employee atau hr.' }, { status: 400 })
    }

    let employee: any = null
    if (employeeId) {
      const employeeResult = await admin
        .from('employees')
        .select('id,employee_number,full_name,email,department,position,is_active')
        .eq('id', employeeId)
        .maybeSingle()
      if (employeeResult.error || !employeeResult.data) {
        return NextResponse.json({ message: 'Employee yang dipilih tidak ditemukan.' }, { status: 404 })
      }
      employee = employeeResult.data
    }

    const existingByEmail = await admin
      .from('app_users')
      .select('id,email,employee_id')
      .ilike('email', email)
      .maybeSingle()
    if (!existingByEmail.error && existingByEmail.data) {
      return NextResponse.json({ message: 'Email tersebut sudah terdaftar di app_users.' }, { status: 409 })
    }

    if (employeeId) {
      const existingByEmployee = await admin
        .from('app_users')
        .select('id,email,employee_id')
        .eq('employee_id', employeeId)
        .maybeSingle()
      if (!existingByEmployee.error && existingByEmployee.data) {
        return NextResponse.json({ message: 'Employee tersebut sudah mempunyai akun HARMONY.' }, { status: 409 })
      }
    }

    let authUser = await findAuthUserByEmail(admin, email)
    let createdAuth = false

    if (!authUser) {
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          employee_id: employeeId,
          employee_number: employee?.employee_number || null,
          full_name: employee?.full_name || null,
          source: 'harmony_hr_users_v8',
        },
      })
      if (created.error || !created.data?.user) throw created.error || new Error('Auth user gagal dibuat.')
      authUser = created.data.user
      createdAuth = true
    } else {
      const updated = await admin.auth.admin.updateUserById(authUser.id, {
        password,
        email_confirm: true,
        user_metadata: {
          ...(authUser.user_metadata || {}),
          employee_id: employeeId,
          employee_number: employee?.employee_number || null,
          full_name: employee?.full_name || null,
          source: 'harmony_hr_users_v8',
        },
      })
      if (updated.error) throw updated.error
      authUser = updated.data.user || authUser
    }

    const now = new Date().toISOString()
    const insertResult = await admin.from('app_users').insert({
      id: authUser.id,
      email,
      role,
      employee_id: employeeId,
      is_active: true,
      created_at: now,
      updated_at: now,
    })

    if (insertResult.error) {
      if (createdAuth) await admin.auth.admin.deleteUser(authUser.id).catch(() => undefined)
      throw insertResult.error
    }

    if (employeeId) {
      await admin.from('employees').update({ email, updated_at: now }).eq('id', employeeId)
    }

    await writeAudit(admin, actor, {
      action_type: 'create_harmony_user',
      target_employee_id: employeeId,
      target_employee_number: employee?.employee_number || null,
      target_full_name: employee?.full_name || email,
      metadata: { target_user_id: authUser.id, target_email: email, role },
    })

    return NextResponse.json({
      message: 'User berhasil dibuat dan disinkronkan dengan Supabase Auth.',
      user: { id: authUser.id, email, role, employee_id: employeeId, is_active: true },
    })
  } catch (error) {
    const result = apiError(error, 'Gagal membuat user.')
    return NextResponse.json({ message: result.message, error: result.error }, { status: result.status })
  }
}

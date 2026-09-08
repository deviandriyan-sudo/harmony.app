import { NextRequest, NextResponse } from 'next/server'

import {
  apiError,
  isAllowedManagedRole,
  isValidEmail,
  normalizeEmail,
  requireHRApi,
} from '@/lib/server/hr-api-auth'

export const runtime = 'nodejs'

type BulkItem = { employee_id: string; email: string; name: string }

type FailedItem = BulkItem & { reason: string }

async function loadAuthEmails(admin: any) {
  const result = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (result.error) throw result.error
  return new Map(result.data.users.map((user: any) => [normalizeEmail(user.email), user]))
}

export async function POST(request: NextRequest) {
  try {
    const { admin, actor } = await requireHRApi(request)
    const body = await request.json().catch(() => null)

    const mode = String(body?.mode || 'selected')
    const defaultPassword = String(body?.default_password || '')
    const role = String(body?.role || 'employee').trim().toLowerCase()
    const selectedIds = Array.isArray(body?.employee_ids)
      ? body.employee_ids.map((value: unknown) => String(value || '').trim()).filter(Boolean)
      : []

    if (defaultPassword.length < 8) {
      return NextResponse.json({ message: 'Password default minimal 8 karakter.' }, { status: 400 })
    }
    if (!isAllowedManagedRole(role)) {
      return NextResponse.json({ message: 'Role hanya boleh employee atau hr.' }, { status: 400 })
    }
    if (!['selected', 'all_missing'].includes(mode)) {
      return NextResponse.json({ message: 'Mode bulk tidak dikenali.' }, { status: 400 })
    }
    if (mode === 'selected' && selectedIds.length === 0) {
      return NextResponse.json({ message: 'Pilih minimal satu employee.' }, { status: 400 })
    }

    let employeesQuery = admin
      .from('employees')
      .select('id,employee_number,full_name,email,department,position,is_active')
      .eq('is_active', true)

    if (mode === 'selected') employeesQuery = employeesQuery.in('id', selectedIds)

    const employeesResult = await employeesQuery.order('full_name', { ascending: true })
    if (employeesResult.error) throw employeesResult.error

    const existingUsersResult = await admin
      .from('app_users')
      .select('id,email,employee_id')
    if (existingUsersResult.error) throw existingUsersResult.error

    const existingEmployeeIds = new Set(
      (existingUsersResult.data || []).map((item: any) => item.employee_id).filter(Boolean),
    )
    const existingEmails = new Set(
      (existingUsersResult.data || []).map((item: any) => normalizeEmail(item.email)).filter(Boolean),
    )
    const authByEmail = await loadAuthEmails(admin)

    const created: BulkItem[] = []
    const skipped: Array<BulkItem & { reason: string }> = []
    const failed: FailedItem[] = []

    for (const employee of employeesResult.data || []) {
      const email = normalizeEmail(employee.email)
      const base: BulkItem = {
        employee_id: employee.id,
        email,
        name: employee.full_name || employee.employee_number || email || employee.id,
      }

      if (!email || !isValidEmail(email)) {
        skipped.push({ ...base, reason: 'Email employee belum valid.' })
        continue
      }
      if (existingEmployeeIds.has(employee.id) || existingEmails.has(email)) {
        skipped.push({ ...base, reason: 'Akun sudah terdaftar.' })
        continue
      }

      try {
        let authUser = authByEmail.get(email) as any
        let createdAuth = false
        if (!authUser) {
          const createResult = await admin.auth.admin.createUser({
            email,
            password: defaultPassword,
            email_confirm: true,
            user_metadata: {
              employee_id: employee.id,
              employee_number: employee.employee_number || null,
              full_name: employee.full_name || null,
              source: 'harmony_hr_bulk_v8',
            },
          })
          if (createResult.error || !createResult.data?.user) {
            throw createResult.error || new Error('Auth user gagal dibuat.')
          }
          authUser = createResult.data.user
          authByEmail.set(email, authUser)
          createdAuth = true
        } else {
          const updateResult = await admin.auth.admin.updateUserById(authUser.id, {
            password: defaultPassword,
            email_confirm: true,
            user_metadata: {
              ...(authUser.user_metadata || {}),
              employee_id: employee.id,
              employee_number: employee.employee_number || null,
              full_name: employee.full_name || null,
              source: 'harmony_hr_bulk_v8',
            },
          })
          if (updateResult.error) throw updateResult.error
        }

        const now = new Date().toISOString()
        const appInsert = await admin.from('app_users').insert({
          id: authUser.id,
          email,
          role,
          employee_id: employee.id,
          is_active: true,
          created_at: now,
          updated_at: now,
        })
        if (appInsert.error) {
          if (createdAuth) await admin.auth.admin.deleteUser(authUser.id).catch(() => undefined)
          throw appInsert.error
        }

        existingEmployeeIds.add(employee.id)
        existingEmails.add(email)
        created.push(base)
      } catch (error: any) {
        failed.push({ ...base, reason: error?.message || 'Gagal membuat akun.' })
      }
    }

    await admin.from('hr_setting_action_logs').insert({
      actor_user_id: actor.id,
      actor_email: actor.email,
      action_type: 'bulk_create_harmony_users',
      target_full_name: `Bulk ${mode}`,
      metadata: {
        mode,
        role,
        created_count: created.length,
        skipped_count: skipped.length,
        failed_count: failed.length,
      },
    })

    return NextResponse.json({
      message: `Bulk selesai. Created ${created.length}, skipped ${skipped.length}, failed ${failed.length}.`,
      created,
      skipped,
      failed,
    })
  } catch (error) {
    const result = apiError(error, 'Bulk user gagal diproses.')
    return NextResponse.json({ message: result.message, error: result.error }, { status: result.status })
  }
}

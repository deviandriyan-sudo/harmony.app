import { NextRequest, NextResponse } from 'next/server'

import {
  apiError,
  isAllowedManagedRole,
  requireHRApi,
} from '@/lib/server/hr-api-auth'

export const runtime = 'nodejs'

export async function PATCH(request: NextRequest) {
  try {
    const { admin, actor } = await requireHRApi(request)
    const body = await request.json().catch(() => null)
    const userId = String(body?.user_id || '').trim()

    if (!userId) {
      return NextResponse.json({ message: 'User ID wajib diisi.' }, { status: 400 })
    }

    const current = await admin
      .from('app_users')
      .select('id,email,role,employee_id,is_active')
      .eq('id', userId)
      .maybeSingle()
    if (current.error || !current.data) {
      return NextResponse.json({ message: 'User tidak ditemukan.' }, { status: 404 })
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (userId === actor.id) {
      const wantsInactive = Object.prototype.hasOwnProperty.call(body || {}, 'is_active') && body.is_active === false
      const wantsNonHrRole = Object.prototype.hasOwnProperty.call(body || {}, 'role') && String(body.role || '').trim().toLowerCase() !== 'hr'
      if (wantsInactive || wantsNonHrRole) {
        return NextResponse.json(
          { message: 'Akun HR yang sedang digunakan tidak boleh menonaktifkan atau menurunkan role dirinya sendiri.' },
          { status: 400 },
        )
      }
    }

    if (Object.prototype.hasOwnProperty.call(body || {}, 'role')) {
      if (!isAllowedManagedRole(body.role)) {
        return NextResponse.json({ message: 'Role hanya boleh employee atau hr.' }, { status: 400 })
      }
      updates.role = String(body.role).trim().toLowerCase()
    }

    if (Object.prototype.hasOwnProperty.call(body || {}, 'is_active')) {
      updates.is_active = Boolean(body.is_active)
    }

    if (Object.prototype.hasOwnProperty.call(body || {}, 'employee_id')) {
      const nextEmployeeId = String(body.employee_id || '').trim() || null
      if (nextEmployeeId) {
        const employee = await admin.from('employees').select('id').eq('id', nextEmployeeId).maybeSingle()
        if (employee.error || !employee.data) {
          return NextResponse.json({ message: 'Employee target tidak ditemukan.' }, { status: 404 })
        }
        const conflict = await admin
          .from('app_users')
          .select('id')
          .eq('employee_id', nextEmployeeId)
          .neq('id', userId)
          .maybeSingle()
        if (!conflict.error && conflict.data) {
          return NextResponse.json({ message: 'Employee target sudah terhubung ke user lain.' }, { status: 409 })
        }
      }
      updates.employee_id = nextEmployeeId
    }

    const updateResult = await admin.from('app_users').update(updates).eq('id', userId).select('*').single()
    if (updateResult.error) throw updateResult.error

    await admin.from('hr_setting_action_logs').insert({
      actor_user_id: actor.id,
      actor_email: actor.email,
      action_type: 'update_harmony_user',
      target_employee_id: updateResult.data.employee_id || null,
      target_full_name: updateResult.data.email || userId,
      metadata: {
        target_user_id: userId,
        previous_role: current.data.role,
        previous_active: current.data.is_active,
        changes: updates,
      },
    })

    return NextResponse.json({ message: 'User berhasil diperbarui.', user: updateResult.data })
  } catch (error) {
    const result = apiError(error, 'Gagal update user.')
    return NextResponse.json({ message: result.message, error: result.error }, { status: result.status })
  }
}

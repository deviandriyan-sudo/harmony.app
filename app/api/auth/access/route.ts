
import { readErrorMessage } from '@/lib/error-utils'
import { NextRequest, NextResponse } from 'next/server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getHarmonySystemControl, isHarmonyHrRole } from '@/lib/server/system-control'

export const dynamic = 'force-dynamic'

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || ''
}

function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request)
    if (!token) return NextResponse.json({ message: 'Session login tidak ditemukan.' }, { status: 401 })

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !authData.user) {
      return NextResponse.json({ message: 'Session HARMONY tidak valid. Silakan login ulang.' }, { status: 401 })
    }

    const authUserId = authData.user.id
    const authEmail = normalize(authData.user.email)

    let appUser: { id: string; email: string | null; role: string; employee_id: string | null; is_active: boolean | null } | null = null
    const byId = await supabaseAdmin
      .from('app_users')
      .select('id,email,role,employee_id,is_active')
      .eq('id', authUserId)
      .maybeSingle()

    if (!byId.error && byId.data) appUser = byId.data

    if (!appUser && authEmail) {
      const byEmail = await supabaseAdmin
        .from('app_users')
        .select('id,email,role,employee_id,is_active')
        .ilike('email', authEmail)
        .maybeSingle()
      if (!byEmail.error && byEmail.data) appUser = byEmail.data
    }

    if (appUser) {
      if (appUser.is_active === false) {
        return NextResponse.json({ message: 'Akun HARMONY tidak aktif.' }, { status: 403 })
      }

      const role = normalize(appUser.role)
      if (!['hr', 'employee'].includes(role)) {
        return NextResponse.json({ message: 'Role akun HARMONY tidak dikenali.' }, { status: 403 })
      }

      let employee: { id: string; employee_number: string | null; full_name: string | null; department: string | null; position: string | null; email: string | null; is_active: boolean | null } | null = null
      if (appUser.employee_id) {
        const employeeResult = await supabaseAdmin
          .from('employees')
          .select('id,employee_number,full_name,department,position,email,is_active')
          .eq('id', appUser.employee_id)
          .maybeSingle()
        if (!employeeResult.error && employeeResult.data) employee = employeeResult.data
      }

      if (!employee && authEmail) {
        const employeeByEmail = await supabaseAdmin
          .from('employees')
          .select('id,employee_number,full_name,department,position,email,is_active')
          .ilike('email', authEmail)
          .maybeSingle()
        if (!employeeByEmail.error && employeeByEmail.data) employee = employeeByEmail.data
      }

      const control = await getHarmonySystemControl(supabaseAdmin)
      if (!control.systemEnabled && !isHarmonyHrRole(role)) {
        return NextResponse.json(
          { message: control.maintenanceMessage, code: 'HARMONY_MAINTENANCE' },
          { status: 503 },
        )
      }

      return NextResponse.json({
        kind: 'harmony',
        appUser: {
          id: appUser.id,
          email: appUser.email,
          role,
          employee_id: appUser.employee_id,
          is_active: appUser.is_active,
        },
        employee,
        home: role === 'hr' ? '/hr/dashboard' : '/employee/dashboard',
      })
    }

    let financeAccess: { id: string; auth_user_id: string; email: string | null; role: string | null; is_active: boolean | null } | null = null
    const financeById = await supabaseAdmin
      .from('remed_user_access')
      .select('id,auth_user_id,email,role,is_active')
      .eq('auth_user_id', authUserId)
      .maybeSingle()

    if (!financeById.error && financeById.data) financeAccess = financeById.data

    if (!financeAccess && authEmail) {
      const financeByEmail = await supabaseAdmin
        .from('remed_user_access')
        .select('id,auth_user_id,email,role,is_active')
        .ilike('email', authEmail)
        .maybeSingle()
      if (!financeByEmail.error && financeByEmail.data) financeAccess = financeByEmail.data
    }

    if (financeAccess && financeAccess.is_active !== false && normalize(financeAccess.role) === 'finance') {
      const control = await getHarmonySystemControl(supabaseAdmin)
      if (!control.systemEnabled) {
        return NextResponse.json(
          { message: control.maintenanceMessage, code: 'HARMONY_MAINTENANCE' },
          { status: 503 },
        )
      }

      return NextResponse.json({
        kind: 'finance',
        appUser: null,
        employee: null,
        home: '/remed/finance/dashboard',
      })
    }

    return NextResponse.json(
      { message: 'Akun belum terdaftar atau tidak aktif pada HARMONY.' },
      { status: 403 },
    )
  } catch (error: unknown) {
    return NextResponse.json(
      { message: readErrorMessage(error) || 'Gagal memeriksa akses HARMONY.' },
      { status: 500 },
    )
  }
}

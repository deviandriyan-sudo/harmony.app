import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

type BulkCreatePayload = {
  mode: 'selected' | 'all_missing'
  employee_ids?: string[]
  default_password: string
  role?: 'employee' | 'hr'
}

type EmployeeRow = {
  id: string
  email: string | null
  full_name: string | null
  employee_number: string | null
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as BulkCreatePayload

    const defaultPassword = payload.default_password
    const role = payload.role || 'employee'

    if (!defaultPassword || defaultPassword.length < 6) {
      return NextResponse.json(
        {
          message: 'Password default minimal 6 karakter.',
        },
        {
          status: 400,
        }
      )
    }

    let employeeQuery = supabaseAdmin
      .from('employees')
      .select('id, email, full_name, employee_number')
      .eq('is_active', true)
      .not('email', 'is', null)
      .order('full_name', { ascending: true })

    if (payload.mode === 'selected') {
      if (!payload.employee_ids || payload.employee_ids.length === 0) {
        return NextResponse.json(
          {
            message: 'Pilih minimal satu employee.',
          },
          {
            status: 400,
          }
        )
      }

      employeeQuery = employeeQuery.in('id', payload.employee_ids)
    }

    const { data: employees, error: employeeError } = await employeeQuery

    if (employeeError) {
      return NextResponse.json(
        {
          message: employeeError.message,
        },
        {
          status: 400,
        }
      )
    }

    const employeeRows = (employees || []) as EmployeeRow[]

    const { data: existingUsers, error: existingError } = await supabaseAdmin
      .from('app_users')
      .select('id, email, employee_id')

    if (existingError) {
      return NextResponse.json(
        {
          message: existingError.message,
        },
        {
          status: 400,
        }
      )
    }

    const existingEmployeeIds = new Set(
      (existingUsers || [])
        .map((item) => item.employee_id)
        .filter(Boolean)
    )

    const existingEmails = new Set(
      (existingUsers || [])
        .map((item) => String(item.email || '').toLowerCase())
        .filter(Boolean)
    )

    const targetEmployees = employeeRows.filter((employee) => {
      const email = String(employee.email || '').trim().toLowerCase()

      if (!email) return false
      if (existingEmployeeIds.has(employee.id)) return false
      if (existingEmails.has(email)) return false

      return true
    })

    if (targetEmployees.length === 0) {
      return NextResponse.json({
        message: 'Tidak ada employee baru yang bisa dibuatkan user.',
        created: [],
        skipped: employeeRows.map((employee) => ({
          employee_id: employee.id,
          email: employee.email,
          reason: 'Employee sudah memiliki user atau email tidak tersedia.',
        })),
        failed: [],
      })
    }

    const created: {
      employee_id: string
      email: string
      user_id: string
    }[] = []

    const failed: {
      employee_id: string
      email: string
      message: string
    }[] = []

    const skipped: {
      employee_id: string
      email: string | null
      reason: string
    }[] = []

    for (const employee of employeeRows) {
      const email = String(employee.email || '').trim().toLowerCase()

      if (!email) {
        skipped.push({
          employee_id: employee.id,
          email: employee.email,
          reason: 'Employee tidak memiliki email.',
        })
        continue
      }

      if (existingEmployeeIds.has(employee.id) || existingEmails.has(email)) {
        skipped.push({
          employee_id: employee.id,
          email,
          reason: 'Employee sudah memiliki user.',
        })
        continue
      }

      const { data: createdUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: {
            role,
            employee_id: employee.id,
          },
        })

      if (createError || !createdUser.user) {
        failed.push({
          employee_id: employee.id,
          email,
          message: createError?.message || 'Gagal membuat user Supabase Auth.',
        })
        continue
      }

      const { error: profileError } = await supabaseAdmin
        .from('app_users')
        .upsert({
          id: createdUser.user.id,
          email,
          role,
          employee_id: employee.id,
          is_active: true,
          updated_at: new Date().toISOString(),
        })

      if (profileError) {
        failed.push({
          employee_id: employee.id,
          email,
          message: profileError.message,
        })
        continue
      }

      created.push({
        employee_id: employee.id,
        email,
        user_id: createdUser.user.id,
      })
    }

    return NextResponse.json({
      message: `${created.length} user berhasil dibuat. ${skipped.length} dilewati. ${failed.length} gagal.`,
      created,
      skipped,
      failed,
    })
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Terjadi kesalahan saat bulk create user.',
      },
      {
        status: 500,
      }
    )
  }
}
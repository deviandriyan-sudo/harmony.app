import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

type CreateUserPayload = {
  email: string
  password: string
  role: 'hr' | 'employee'
  employee_id?: string | null
}

async function findAuthUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (error) {
    return {
      user: null,
      error: error.message,
    }
  }

  const user = data.users.find((item) => {
    return item.email?.toLowerCase() === email.toLowerCase()
  })

  return {
    user: user || null,
    error: null,
  }
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('app_users')
    .select(`
      id,
      email,
      role,
      employee_id,
      is_active,
      created_at,
      updated_at,
      employees (
        id,
        employee_number,
        full_name,
        department,
        position,
        machine_pin
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      {
        message: error.message,
      },
      {
        status: 400,
      }
    )
  }

  return NextResponse.json({
    users: data || [],
  })
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CreateUserPayload

    const email = payload.email?.trim().toLowerCase()
    const password = payload.password?.trim()
    const role = payload.role || 'employee'
    const employeeId = payload.employee_id || null

    if (!email) {
      return NextResponse.json(
        {
          message: 'Email wajib diisi.',
        },
        {
          status: 400,
        }
      )
    }

    if (!email.includes('@')) {
      return NextResponse.json(
        {
          message: 'Format email tidak valid.',
        },
        {
          status: 400,
        }
      )
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        {
          message: 'Password minimal 6 karakter.',
        },
        {
          status: 400,
        }
      )
    }

    if (!['hr', 'employee'].includes(role)) {
      return NextResponse.json(
        {
          message: 'Role tidak valid. Pilih HR atau Employee.',
        },
        {
          status: 400,
        }
      )
    }

    /**
     * HR boleh tanpa employee_id.
     * Employee juga sementara boleh tanpa employee_id,
     * supaya user bisa dibuat dulu lalu dihubungkan belakangan.
     */

    const existingAuthUser = await findAuthUserByEmail(email)

    if (existingAuthUser.error) {
      return NextResponse.json(
        {
          message: existingAuthUser.error,
        },
        {
          status: 400,
        }
      )
    }

    let authUserId = existingAuthUser.user?.id || ''

    if (existingAuthUser.user) {
      const { error: updateAuthError } =
        await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.user.id, {
          password,
          email_confirm: true,
          user_metadata: {
            role,
            employee_id: employeeId,
          },
        })

      if (updateAuthError) {
        return NextResponse.json(
          {
            message: updateAuthError.message,
          },
          {
            status: 400,
          }
        )
      }

      authUserId = existingAuthUser.user.id
    } else {
      const { data: createdUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            role,
            employee_id: employeeId,
          },
        })

      if (createError || !createdUser.user) {
        return NextResponse.json(
          {
            message:
              createError?.message ||
              'Gagal membuat user di Supabase Authentication.',
          },
          {
            status: 400,
          }
        )
      }

      authUserId = createdUser.user.id
    }

    const { error: appUserError } = await supabaseAdmin
      .from('app_users')
      .upsert(
        {
          id: authUserId,
          email,
          role,
          employee_id: employeeId,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'id',
        }
      )

    if (appUserError) {
      return NextResponse.json(
        {
          message: appUserError.message,
        },
        {
          status: 400,
        }
      )
    }

    return NextResponse.json({
      message: existingAuthUser.user
        ? 'User sudah ada di Supabase Auth. Password, role, dan app_users berhasil diperbarui.'
        : 'User berhasil dibuat dan masuk ke Supabase Auth.',
      user: {
        id: authUserId,
        email,
        role,
        employee_id: employeeId,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Terjadi kesalahan saat membuat user.',
      },
      {
        status: 500,
      }
    )
  }
}
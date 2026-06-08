import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

type UpdateUserPayload = {
  user_id: string
  role?: 'hr' | 'employee'
  employee_id?: string | null
  is_active?: boolean
}

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as UpdateUserPayload

    if (!payload.user_id) {
      return NextResponse.json(
        {
          message: 'User ID wajib diisi.',
        },
        {
          status: 400,
        }
      )
    }

    if (payload.role && !['hr', 'employee'].includes(payload.role)) {
      return NextResponse.json(
        {
          message: 'Role tidak valid.',
        },
        {
          status: 400,
        }
      )
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (payload.role) {
      updatePayload.role = payload.role
    }

    if (payload.employee_id !== undefined) {
      updatePayload.employee_id = payload.employee_id
    }

    if (payload.is_active !== undefined) {
      updatePayload.is_active = payload.is_active
    }

    const { error } = await supabaseAdmin
      .from('app_users')
      .update(updatePayload)
      .eq('id', payload.user_id)

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

    if (payload.role || payload.employee_id !== undefined) {
      await supabaseAdmin.auth.admin.updateUserById(payload.user_id, {
        user_metadata: {
          role: payload.role,
          employee_id: payload.employee_id,
        },
      })
    }

    return NextResponse.json({
      message: 'User berhasil diperbarui.',
    })
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Terjadi kesalahan saat update user.',
      },
      {
        status: 500,
      }
    )
  }
}
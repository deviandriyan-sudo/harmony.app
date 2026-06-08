import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

type ResetPasswordPayload = {
  user_id: string
  new_password: string
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ResetPasswordPayload

    const userId = payload.user_id
    const newPassword = payload.new_password

    if (!userId) {
      return NextResponse.json(
        {
          message: 'User ID wajib diisi.',
        },
        {
          status: 400,
        }
      )
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        {
          message: 'Password baru minimal 6 karakter.',
        },
        {
          status: 400,
        }
      )
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        password: newPassword,
      }
    )

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
      message: 'Password user berhasil direset.',
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Terjadi kesalahan saat reset password.',
      },
      {
        status: 500,
      }
    )
  }
}
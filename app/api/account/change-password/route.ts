import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type ChangePasswordPayload = {
  access_token: string
  new_password: string
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ChangePasswordPayload

    if (!payload.access_token) {
      return NextResponse.json(
        {
          message: 'Session tidak ditemukan. Silakan login ulang.',
        },
        {
          status: 401,
        }
      )
    }

    if (!payload.new_password || payload.new_password.length < 6) {
      return NextResponse.json(
        {
          message: 'Password baru minimal 6 karakter.',
        },
        {
          status: 400,
        }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${payload.access_token}`,
          },
        },
      }
    )

    const { error } = await supabase.auth.updateUser({
      password: payload.new_password,
    })

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
      message: 'Password berhasil diperbarui.',
    })
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Terjadi kesalahan saat mengubah password.',
      },
      {
        status: 500,
      }
    )
  }
}
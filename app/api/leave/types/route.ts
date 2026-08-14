import {
  NextRequest,
  NextResponse,
} from 'next/server'

import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function env(name: string) {
  return String(
    process.env[name] || '',
  ).trim()
}

function bearer(request: NextRequest) {
  return String(
    request.headers.get('authorization') || '',
  )
    .replace(/^Bearer\s+/i, '')
    .trim()
}

export async function GET(
  request: NextRequest,
) {
  try {
    const url = env(
      'NEXT_PUBLIC_SUPABASE_URL',
    )

    const anon = env(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    )

    const token = bearer(request)

    if (!url || !anon) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Environment Supabase belum lengkap.',
        },
        {
          status: 500,
        },
      )
    }

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Session login tidak ditemukan.',
        },
        {
          status: 401,
        },
      )
    }

    const supabase = createClient(
      url,
      anon,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },

        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    )

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.getUser(token)

    if (
      authError ||
      !authData.user
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Session login tidak valid.',
        },
        {
          status: 401,
        },
      )
    }

    const {
      data,
      error,
    } = await supabase
      .from('harmony_request_types')
      .select('*')
      .order('sort_order', {
        ascending: true,
      })
      .order('label', {
        ascending: true,
      })

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        {
          status: 500,
        },
      )
    }

    return NextResponse.json(
      {
        success: true,
        types: data || [],
      },
      {
        headers: {
          'Cache-Control':
            'no-store, max-age=0',
        },
      },
    )
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          'Gagal memuat master jenis.',
      },
      {
        status: 500,
      },
    )
  }
}
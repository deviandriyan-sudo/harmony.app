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

async function clientFor(
  request: NextRequest,
) {
  const url = env(
    'NEXT_PUBLIC_SUPABASE_URL',
  )

  const anon = env(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  )

  const token = bearer(request)

  if (
    !url ||
    !anon ||
    !token
  ) {
    throw new Error(
      'Session atau environment Supabase belum tersedia.',
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
    throw new Error(
      'Session login tidak valid.',
    )
  }

  const {
    data: allowed,
    error: roleError,
  } = await supabase.rpc(
    'harmony_leave_is_active_hr_admin',
  )

  if (
    roleError ||
    !allowed
  ) {
    throw new Error(
      'Hanya HR/Admin aktif yang dapat mengelola master jenis.',
    )
  }

  return supabase
}

export async function POST(
  request: NextRequest,
) {
  try {
    const supabase =
      await clientFor(request)

    const body =
      await request
        .json()
        .catch(() => null)

    const {
      data,
      error,
    } = await supabase.rpc(
      'hr_upsert_harmony_request_type',
      {
        p_code:
          String(
            body?.code || '',
          ),

        p_label:
          String(
            body?.label || '',
          ),

        p_group_label:
          String(
            body?.group_label ||
              'Keterangan Lain',
          ),

        p_request_category:
          String(
            body?.request_category ||
              'other',
          ),

        p_attendance_status:
          String(
            body?.attendance_status ||
              'absent',
          ),

        p_description:
          body?.description
            ? String(
                body.description,
              )
            : null,

        p_requires_proof:
          Boolean(
            body?.requires_proof,
          ),

        p_requires_manual_time:
          Boolean(
            body?.requires_manual_time,
          ),

        p_is_leave_like:
          Boolean(
            body?.is_leave_like,
          ),

        p_is_absence_like:
          body?.is_absence_like !==
          false,

        p_show_in_attendance:
          body?.show_in_attendance !==
          false,

        p_show_in_leave:
          body?.show_in_leave !==
          false,

        p_sort_order:
          Number(
            body?.sort_order ||
              500,
          ),
      },
    )

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      result: data,
    })
  } catch (error: any) {
    const message =
      error?.message ||
      'Gagal menyimpan jenis kehadiran/ketidakhadiran.'

    const status =
      /session/i.test(message)
        ? 401
        : /Hanya HR|akses/i.test(
              message,
            )
          ? 403
          : 400

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status,
      },
    )
  }
}

export async function PATCH(
  request: NextRequest,
) {
  try {
    const supabase =
      await clientFor(request)

    const body =
      await request
        .json()
        .catch(() => null)

    const {
      data,
      error,
    } = await supabase.rpc(
      'hr_set_harmony_request_type_active',
      {
        p_code:
          String(
            body?.code || '',
          ),

        p_is_active:
          Boolean(
            body?.is_active,
          ),

        p_note:
          body?.note
            ? String(
                body.note,
              )
            : null,
      },
    )

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      result: data,
    })
  } catch (error: any) {
    const message =
      error?.message ||
      'Gagal mengubah status master jenis.'

    const status =
      /session/i.test(message)
        ? 401
        : /Hanya HR|akses/i.test(
              message,
            )
          ? 403
          : 400

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status,
      },
    )
  }
}
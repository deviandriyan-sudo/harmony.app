import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import {
  getNotificationEnvironmentStatus,
  getResendDomainDiagnostic,
  isValidNotificationEmail,
  sendHarmonyServerEmail,
} from '@/lib/notifications-server'

export const runtime = 'nodejs'

type SendEmailPayload = {
  to?: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject?: string
  html?: string
  text?: string
  replyTo?: string
}

function normalizeRole(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

function normalizeRecipients(
  value?: string | string[]
) {
  if (!value) return []

  const source = Array.isArray(value) ? value : [value]
  return Array.from(
    new Set(
      source
        .map((item) => normalizeEmail(item))
        .filter(Boolean)
    )
  )
}

function buildError(
  message: string,
  status = 400,
  extras: Record<string, unknown> = {}
) {
  return NextResponse.json(
    {
      ok: false,
      message,
      ...extras,
    },
    { status }
  )
}

async function getAuthenticatedAppUser(request: Request) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      ok: false as const,
      status: 500,
      message:
        'Supabase server env belum lengkap. Pastikan NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY tersedia.',
    }
  }

  const authHeader =
    request.headers.get('authorization') || ''
  const token = authHeader
    .replace(/^Bearer\s+/i, '')
    .trim()

  if (!token) {
    return {
      ok: false as const,
      status: 401,
      message:
        'Token login HARMONY tidak ditemukan.',
    }
  }

  const admin = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  const {
    data: authData,
    error: authError,
  } = await admin.auth.getUser(token)

  if (authError || !authData.user) {
    return {
      ok: false as const,
      status: 401,
      message:
        'Session HARMONY tidak valid. Silakan login ulang.',
    }
  }

  let appUser: any = null

  const byId = await admin
    .from('app_users')
    .select('*')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (!byId.error && byId.data) {
    appUser = byId.data
  }

  if (!appUser && authData.user.email) {
    const byEmail = await admin
      .from('app_users')
      .select('*')
      .eq(
        'email',
        normalizeEmail(authData.user.email)
      )
      .maybeSingle()

    if (!byEmail.error) {
      appUser = byEmail.data
    }
  }

  if (!appUser || appUser.is_active === false) {
    return {
      ok: false as const,
      status: 403,
      message:
        'Akun HARMONY tidak aktif atau belum terdaftar pada app_users.',
    }
  }

  return {
    ok: true as const,
    admin,
    authUser: authData.user,
    appUser,
  }
}

async function validateRecipientsAreHarmonyUsers(
  admin: any,
  recipients: string[]
) {
  if (recipients.length === 0) {
    return {
      ok: true,
      invalid: [] as string[],
    }
  }

  const [
    employeesResponse,
    appUsersResponse,
  ] = await Promise.all([
    admin
      .from('employees')
      .select('email')
      .not('email', 'is', null),
    admin
      .from('app_users')
      .select('email')
      .not('email', 'is', null),
  ])

  if (
    employeesResponse.error ||
    appUsersResponse.error
  ) {
    return {
      ok: false,
      invalid: recipients,
      message:
        employeesResponse.error?.message ||
        appUsersResponse.error?.message ||
        'Daftar email HARMONY tidak dapat divalidasi.',
    }
  }

  const allowed = new Set<string>()

  ;[
    ...(employeesResponse.data || []),
    ...(appUsersResponse.data || []),
  ].forEach((row: any) => {
    const email = normalizeEmail(row?.email)
    if (email) allowed.add(email)
  })

  const invalid = recipients.filter(
    (email) => !allowed.has(normalizeEmail(email))
  )

  return {
    ok: invalid.length === 0,
    invalid,
    message:
      invalid.length > 0
        ? `Penerima bukan email yang terdaftar di HARMONY: ${invalid.join(', ')}`
        : '',
  }
}

export async function GET(request: Request) {
  const auth =
    await getAuthenticatedAppUser(request)

  if (!auth.ok) {
    return buildError(
      auth.message,
      auth.status
    )
  }

  const role = normalizeRole(auth.appUser.role)

  if (
    ![
      'hr',
      'admin',
      'administrator',
      'super_admin',
      'human_resources',
    ].includes(role)
  ) {
    return buildError(
      'Diagnostik email hanya dapat dibuka oleh HR/Admin.',
      403
    )
  }

  const environment =
    getNotificationEnvironmentStatus()
  const domain =
    await getResendDomainDiagnostic()

  const ready =
    environment.resendApiKeyConfigured &&
    environment.fromConfigured &&
    (
      !domain.checked ||
      (
        domain.found &&
        domain.status === 'verified' &&
        domain.sendingCapability !== 'disabled'
      )
    )

  return NextResponse.json({
    ok: true,
    ready,
    environment: {
      resend_api_key_configured:
        environment.resendApiKeyConfigured,
      notification_from_configured:
        environment.fromConfigured,
      notification_from:
        environment.fromValue || null,
      sender_email:
        environment.senderEmail || null,
      sender_domain:
        environment.senderDomain || null,
      notification_reply_to:
        environment.replyTo || null,
      app_url: environment.appUrl,
    },
    domain,
    checked_at: new Date().toISOString(),
  })
}

export async function POST(request: Request) {
  try {
    const auth =
      await getAuthenticatedAppUser(request)

    if (!auth.ok) {
      return buildError(
        auth.message,
        auth.status
      )
    }

    const payload =
      (await request
        .json()
        .catch(() => null)) as
        | SendEmailPayload
        | null

    if (!payload) {
      return buildError(
        'Payload email tidak valid.'
      )
    }

    const to = normalizeRecipients(payload.to)
    const cc = normalizeRecipients(payload.cc)
    const bcc = normalizeRecipients(payload.bcc)
    const allRecipients = Array.from(
      new Set([...to, ...cc, ...bcc])
    )

    if (to.length === 0) {
      return buildError(
        'Penerima email wajib diisi.'
      )
    }

    if (allRecipients.length > 50) {
      return buildError(
        'Jumlah penerima maksimal 50 alamat per pengiriman.'
      )
    }

    const invalidFormat =
      allRecipients.filter(
        (email) =>
          !isValidNotificationEmail(email)
      )

    if (invalidFormat.length > 0) {
      return buildError(
        `Format email tidak valid: ${invalidFormat.join(', ')}`
      )
    }

    const recipientCheck =
      await validateRecipientsAreHarmonyUsers(
        auth.admin,
        allRecipients
      )

    if (!recipientCheck.ok) {
      return buildError(
        recipientCheck.message ||
          'Penerima email tidak lolos validasi HARMONY.',
        400,
        {
          invalid_recipients:
            recipientCheck.invalid,
        }
      )
    }

    const result =
      await sendHarmonyServerEmail({
        to,
        cc,
        bcc,
        subject: String(
          payload.subject || ''
        ).trim(),
        html: String(
          payload.html || ''
        ),
        text: String(
          payload.text || ''
        ),
        replyTo: String(
          payload.replyTo || ''
        ).trim(),
      })

    if (!result.ok) {
      return buildError(
        result.message,
        502,
        {
          code:
            'EMAIL_PROVIDER_ERROR',
          hint:
            'Buka HR → Pengaturan → Diagnostik Email untuk mengecek environment dan domain Resend.',
          detail: result.detail || null,
        }
      )
    }

    return NextResponse.json({
      ok: true,
      message:
        'Email notifikasi berhasil dikirim.',
      provider_id:
        result.providerId || null,
      sent_to: to,
      cc,
      bcc,
    })
  } catch (error: any) {
    return buildError(
      error?.message ||
        'Terjadi kesalahan pada pusat notifikasi HARMONY.',
      500,
      {
        code:
          'HARMONY_NOTIFICATION_ERROR',
      }
    )
  }
}
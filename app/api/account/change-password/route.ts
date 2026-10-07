import { NextRequest, NextResponse } from 'next/server'
import {
  buildServerHarmonyEmailHtml,
  buildServerHarmonyEmailText,
  getNotificationEnvironmentStatus,
  sendHarmonyServerEmail,
} from '@/lib/notifications-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

type ChangePasswordPayload = {
  new_password?: string
  source?: 'self_service' | 'recovery' | 'finance_self_service'
}

export const runtime = 'nodejs'

function bearer(request: NextRequest) {
  const header = request.headers.get('authorization') || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || ''
}

function displayNameFromEmail(email: string) {
  const local = email.split('@')[0] || 'Pengguna HARMONY'
  return local
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (value) => value.toUpperCase())
}

async function resolveDisplayName(email: string, metadata: Record<string, unknown> | null | undefined) {
  const metadataName = String(metadata?.full_name || metadata?.name || '').trim()
  if (metadataName) return metadataName

  const employee = await supabaseAdmin
    .from('employees')
    .select('full_name')
    .ilike('email', email)
    .maybeSingle()

  return String(employee.data?.full_name || '').trim() || displayNameFromEmail(email)
}

async function sendPasswordChangedNotification({
  email,
  fullName,
  source,
}: {
  email: string
  fullName: string
  source: ChangePasswordPayload['source']
}) {
  const env = getNotificationEnvironmentStatus()

  if (!env.resendApiKeyConfigured || !env.fromConfigured) {
    return {
      ok: false,
      message: 'Konfigurasi email belum lengkap. Password tetap berhasil diubah.',
    }
  }

  const viaRecovery = source === 'recovery'
  const message = [
    `Yth. ${fullName || email},`,
    '',
    viaRecovery
      ? 'Password akun HARMONY Anda berhasil diubah melalui proses Lupa Password.'
      : 'Password akun HARMONY Anda berhasil diubah.',
    'Demi keamanan, password baru tidak dicantumkan di email ini.',
    '',
    'Jika Anda tidak melakukan perubahan ini, segera hubungi HR Administrator.',
  ].join('\n')

  const result = await sendHarmonyServerEmail({
    to: email,
    subject: '[HARMONY] Password Akun Berhasil Diubah',
    html: buildServerHarmonyEmailHtml({
      title: 'Password Akun Berhasil Diubah',
      message,
      actionLabel: 'Buka HARMONY',
      actionUrl: `${env.appUrl}/login`,
      footer: 'Email ini dikirim otomatis oleh HARMONY.',
    }),
    text: buildServerHarmonyEmailText({
      title: 'Password Akun Berhasil Diubah',
      message,
      actionLabel: 'Buka HARMONY',
      actionUrl: `${env.appUrl}/login`,
      footer: 'Email ini dikirim otomatis oleh HARMONY.',
    }),
  })

  return { ok: result.ok, message: result.message }
}

export async function POST(request: NextRequest) {
  try {
    const token = bearer(request)
    if (!token) {
      return NextResponse.json(
        { message: 'Session tidak ditemukan. Silakan login ulang.' },
        { status: 401 },
      )
    }

    const payload = (await request.json().catch(() => null)) as ChangePasswordPayload | null
    const newPassword = String(payload?.new_password || '')

    if (newPassword.length < 8) {
      return NextResponse.json(
        { message: 'Password baru minimal 8 karakter.' },
        { status: 400 },
      )
    }

    const authResult = await supabaseAdmin.auth.getUser(token)
    if (authResult.error || !authResult.data.user) {
      return NextResponse.json(
        { message: 'Session HARMONY tidak valid. Silakan login ulang.' },
        { status: 401 },
      )
    }

    const email = String(authResult.data.user.email || '').trim().toLowerCase()
    if (!email) {
      return NextResponse.json(
        { message: 'Email akun tidak ditemukan.' },
        { status: 400 },
      )
    }

    const update = await supabaseAdmin.auth.admin.updateUserById(
      authResult.data.user.id,
      { password: newPassword },
    )
    if (update.error) {
      return NextResponse.json({ message: update.error.message }, { status: 400 })
    }

    const fullName = await resolveDisplayName(email, authResult.data.user.user_metadata)
    const notification = await sendPasswordChangedNotification({
      email,
      fullName,
      source: payload?.source || 'self_service',
    })

    return NextResponse.json({
      message: notification.ok
        ? 'Password berhasil diperbarui dan email keamanan berhasil dikirim.'
        : 'Password berhasil diperbarui, tetapi email keamanan gagal dikirim.',
      notification,
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Terjadi kesalahan saat mengubah password.',
      },
      { status: 500 },
    )
  }
}

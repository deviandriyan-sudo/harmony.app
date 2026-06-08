import { NextResponse } from 'next/server'
import { Resend } from 'resend'

import { supabaseAdmin } from '@/lib/supabase-admin'

const resendApiKey = process.env.RESEND_API_KEY
const harmonyEmailFrom =
  process.env.HARMONY_EMAIL_FROM || 'Harmony-app <onboarding@resend.dev>'

type SendEmailPayload = {
  to: string
  recipient_name?: string | null
  recipient_user_id?: string | null
  recipient_employee_id?: string | null

  sender_name?: string | null
  sender_user_id?: string | null

  subject: string
  title: string
  message: string

  notification_type?: string | null
  related_module?: string | null
  related_table?: string | null
  related_id?: string | null

  action_url?: string | null
  metadata?: Record<string, unknown>
}

function escapeHtml(value: string) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function buildEmailHtml({
  title,
  message,
  action_url,
}: {
  title: string
  message: string
  action_url?: string | null
}) {
  const safeTitle = escapeHtml(title)
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br />')

  const actionButton = action_url
    ? `
      <div style="margin-top: 28px;">
        <a href="${escapeHtml(action_url)}"
          style="
            display:inline-block;
            padding:12px 18px;
            background:#007aff;
            color:#ffffff;
            border-radius:14px;
            font-weight:700;
            text-decoration:none;
            font-size:14px;
          ">
          Buka HARMONY
        </a>
      </div>
    `
    : ''

  return `
    <div style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#1d1d1f;">
      <div style="max-width:640px;margin:0 auto;padding:32px 18px;">
        <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:28px;padding:28px;box-shadow:0 18px 55px rgba(15,23,42,0.08);">
          <div style="display:inline-block;padding:7px 12px;border-radius:999px;background:#e8f2ff;color:#0059b8;font-size:12px;font-weight:700;">
            HARMONY Notification
          </div>

          <h1 style="margin:22px 0 0;font-size:24px;line-height:1.25;color:#1d1d1f;">
            ${safeTitle}
          </h1>

          <div style="margin-top:16px;font-size:14px;line-height:1.8;color:#515154;">
            ${safeMessage}
          </div>

          ${actionButton}

          <div style="margin-top:30px;padding-top:18px;border-top:1px solid #edf0f3;font-size:12px;line-height:1.7;color:#86868b;">
            Email ini dikirim otomatis oleh sistem HARMONY. Abaikan jika Anda merasa tidak terkait dengan notifikasi ini.
          </div>
        </div>

        <p style="margin:18px 0 0;text-align:center;font-size:11px;color:#9a9aa0;">
          HARMONY · Human Attendance, Request, Monitoring & Leave System
        </p>
      </div>
    </div>
  `
}

export async function POST(request: Request) {
  try {
    if (!resendApiKey) {
      return NextResponse.json(
        {
          success: false,
          message: 'RESEND_API_KEY belum diset di environment variable.',
        },
        { status: 500 }
      )
    }

    const payload = (await request.json()) as SendEmailPayload

    if (!payload.to || !payload.subject || !payload.title || !payload.message) {
      return NextResponse.json(
        {
          success: false,
          message: 'to, subject, title, dan message wajib diisi.',
        },
        { status: 400 }
      )
    }

    const notificationType = payload.notification_type || 'general'

    const { data: logData, error: logError } = await supabaseAdmin
      .from('notification_logs')
      .insert({
        recipient_email: payload.to,
        recipient_name: payload.recipient_name || null,
        recipient_user_id: payload.recipient_user_id || null,
        recipient_employee_id: payload.recipient_employee_id || null,

        sender_name: payload.sender_name || null,
        sender_user_id: payload.sender_user_id || null,

        notification_type: notificationType,
        notification_title: payload.title,
        notification_message: payload.message,

        related_module: payload.related_module || null,
        related_table: payload.related_table || null,
        related_id: payload.related_id || null,

        email_subject: payload.subject,
        email_status: 'pending',
        email_provider: 'resend',
        metadata: payload.metadata || {},
      })
      .select('id')
      .single()

    if (logError) {
      return NextResponse.json(
        {
          success: false,
          message: logError.message,
        },
        { status: 500 }
      )
    }

    const resend = new Resend(resendApiKey)

    const { data, error } = await resend.emails.send({
      from: harmonyEmailFrom,
      to: [payload.to],
      subject: payload.subject,
      html: buildEmailHtml({
        title: payload.title,
        message: payload.message,
        action_url: payload.action_url,
      }),
    })

    if (error) {
      await supabaseAdmin
        .from('notification_logs')
        .update({
          email_status: 'failed',
          email_error: JSON.stringify(error),
          updated_at: new Date().toISOString(),
        })
        .eq('id', logData.id)

      return NextResponse.json(
        {
          success: false,
          message: 'Gagal mengirim email.',
          error,
        },
        { status: 500 }
      )
    }

    await supabaseAdmin
      .from('notification_logs')
      .update({
        email_status: 'sent',
        email_provider_id: data?.id || null,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', logData.id)

    return NextResponse.json({
      success: true,
      message: 'Email notification sent.',
      notification_log_id: logData.id,
      provider_id: data?.id || null,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Unexpected server error.',
      },
      { status: 500 }
    )
  }
}
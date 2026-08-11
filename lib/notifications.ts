import { supabase } from '@/lib/supabase'

export type NotifyPayload = {
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  title: string
  message: string
  actionLabel?: string
  actionUrl?: string
  footer?: string
  replyTo?: string
}

type SendHarmonyEmailResult = {
  ok: boolean
  message: string
  provider_id?: string | null
  sent_to?: string[]
  cc?: string[]
  bcc?: string[]
}

export async function sendHarmonyEmail(
  payload: NotifyPayload
): Promise<SendHarmonyEmailResult> {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession()

  if (sessionError) {
    throw new Error(
      sessionError.message ||
        'Session HARMONY tidak dapat dibaca untuk mengirim notifikasi.'
    )
  }

  const token = sessionData.session?.access_token

  if (!token) {
    throw new Error(
      'Session HARMONY tidak ditemukan. Silakan login ulang sebelum mengirim notifikasi.'
    )
  }

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 20000)

  try {
    const response = await fetch('/api/notifications/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        to: payload.to,
        cc: payload.cc,
        bcc: payload.bcc,
        subject: payload.subject,
        html: buildHarmonyEmailHtml(payload),
        text: buildHarmonyEmailText(payload),
        replyTo: payload.replyTo,
      }),
    })

    const result = await response.json().catch(() => null)

    if (!response.ok || result?.ok === false) {
      const details = [
        result?.message,
        result?.code ? `Code: ${result.code}` : '',
        result?.hint ? `Hint: ${result.hint}` : '',
      ]
        .filter(Boolean)
        .join(' · ')

      throw new Error(
        details ||
          `Email notifikasi gagal dikirim (HTTP ${response.status}).`
      )
    }

    return {
      ok: true,
      message: result?.message || 'Email berhasil dikirim.',
      provider_id: result?.provider_id || result?.data?.id || null,
      sent_to: Array.isArray(result?.sent_to) ? result.sent_to : [],
      cc: Array.isArray(result?.cc) ? result.cc : [],
      bcc: Array.isArray(result?.bcc) ? result.bcc : [],
    }
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error(
        'Pengiriman email melewati batas waktu 20 detik. Cek koneksi Resend dan konfigurasi domain.'
      )
    }

    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

export function buildHarmonyEmailHtml(payload: NotifyPayload) {
  const safeTitle = escapeHtml(payload.title)
  const safeMessage = escapeHtml(payload.message).replace(/\n/g, '<br />')
  const safeActionLabel = escapeHtml(payload.actionLabel || '')
  const safeActionUrl = escapeAttribute(payload.actionUrl || '')
  const safeFooter = escapeHtml(
    payload.footer ||
      'Email ini dikirim otomatis oleh HARMONY. Mohon tidak membalas email ini.'
  )

  const actionButton =
    payload.actionLabel && payload.actionUrl
      ? `
        <tr>
          <td style="padding: 18px 0 2px 0;">
            <a
              href="${safeActionUrl}"
              style="
                display: inline-block;
                background: #007aff;
                color: #ffffff;
                text-decoration: none;
                font-size: 13px;
                font-weight: 700;
                padding: 12px 18px;
                border-radius: 16px;
              "
            >
              ${safeActionLabel}
            </a>
          </td>
        </tr>
      `
      : ''

  return `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>${safeTitle}</title>
      </head>
      <body style="margin:0;padding:0;background:#f5f5f7;font-family:Arial,Helvetica,sans-serif;color:#1d1d1f;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f7;padding:28px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#ffffff;border-radius:28px;overflow:hidden;border:1px solid #e5e5ea;box-shadow:0 18px 45px rgba(15,23,42,.08);">
                <tr>
                  <td style="padding:24px 26px;background:#111113;color:#ffffff;">
                    <div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:rgba(255,255,255,.62);text-transform:uppercase;">
                      HARMONY Notification
                    </div>
                    <div style="margin-top:8px;font-size:22px;font-weight:700;line-height:1.25;">
                      ${safeTitle}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:24px 26px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-size:14px;line-height:1.75;color:#424245;">
                          ${safeMessage}
                        </td>
                      </tr>
                      ${actionButton}
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:16px 26px 24px;color:#86868b;font-size:11px;line-height:1.6;border-top:1px solid #f0f0f2;">
                    ${safeFooter}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

export function buildHarmonyEmailText(payload: NotifyPayload) {
  const lines = [payload.title, '', payload.message, '']

  if (payload.actionLabel && payload.actionUrl) {
    lines.push(`${payload.actionLabel}: ${payload.actionUrl}`)
    lines.push('')
  }

  lines.push(
    payload.footer ||
      'Email ini dikirim otomatis oleh HARMONY. Mohon tidak membalas email ini.'
  )

  return lines.join('\n')
}

function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, '&#096;')
}
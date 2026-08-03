type NotifyPayload = {
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  title: string
  message: string
  actionLabel?: string
  actionUrl?: string
  footer?: string
}

export async function sendHarmonyEmail(payload: NotifyPayload) {
  const response = await fetch('/api/notifications/send-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: payload.to,
      cc: payload.cc,
      bcc: payload.bcc,
      subject: payload.subject,
      html: buildHarmonyEmailHtml(payload),
      text: buildHarmonyEmailText(payload),
    }),
  })

  const result = await response.json().catch(() => null)

  if (!response.ok || result?.ok === false) {
    throw new Error(result?.message || 'Email notifikasi gagal dikirim.')
  }

  return result
}

export function buildHarmonyEmailHtml(payload: NotifyPayload) {
  const safeTitle = escapeHtml(payload.title)
  const safeMessage = escapeHtml(payload.message).replace(/\n/g, '<br />')
  const safeActionLabel = escapeHtml(payload.actionLabel || '')
  const safeActionUrl = escapeAttribute(payload.actionUrl || '')
  const safeFooter = escapeHtml(
    payload.footer || 'Email ini dikirim otomatis oleh HARMONY. Mohon tidak membalas email ini.'
  )

  const actionButton =
    payload.actionLabel && payload.actionUrl
      ? `
        <tr>
          <td style="padding: 18px 0 2px 0;">
            <a href="${safeActionUrl}" style="display: inline-block; background: #007aff; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 18px; border-radius: 16px;">
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
      <body style="margin: 0; padding: 0; background: #f5f5f7; font-family: Arial, Helvetica, sans-serif; color: #1d1d1f;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #f5f5f7; padding: 28px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background: #ffffff; border-radius: 28px; overflow: hidden; border: 1px solid #e5e5ea; box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);">
                <tr>
                  <td style="padding: 24px 26px; background: #111113; color: #ffffff;">
                    <div style="font-size: 11px; font-weight: 700; letter-spacing: .08em; color: rgba(255,255,255,.62); text-transform: uppercase;">
                      HARMONY Notification
                    </div>
                    <div style="margin-top: 8px; font-size: 22px; font-weight: 700; line-height: 1.25;">
                      ${safeTitle}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 24px 26px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-size: 14px; line-height: 1.7; color: #424245;">
                          ${safeMessage}
                        </td>
                      </tr>
                      ${actionButton}
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 16px 26px 24px 26px; color: #86868b; font-size: 11px; line-height: 1.6; border-top: 1px solid #f0f0f2;">
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
  const lines = [
    payload.title,
    '',
    payload.message,
    '',
  ]

  if (payload.actionLabel && payload.actionUrl) {
    lines.push(`${payload.actionLabel}: ${payload.actionUrl}`)
    lines.push('')
  }

  lines.push(payload.footer || 'Email ini dikirim otomatis oleh HARMONY. Mohon tidak membalas email ini.')

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
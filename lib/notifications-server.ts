export type HarmonyServerEmailPayload = {
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  html?: string
  text?: string
  replyTo?: string
}

export type NotificationEnvironmentStatus = {
  resendApiKeyConfigured: boolean
  fromConfigured: boolean
  fromValue: string
  senderEmail: string
  senderDomain: string
  replyTo: string
  appUrl: string
}

export type ResendDomainDiagnostic = {
  checked: boolean
  found: boolean
  name: string
  status: string
  sendingCapability: string
  message: string
}

export type HarmonyServerEmailResult = {
  ok: boolean
  message: string
  providerId?: string | null
  detail?: unknown
}

function normalizeEmailValue(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

function normalizeRecipients(
  value?: string | string[]
): string[] {
  if (!value) return []

  const source = Array.isArray(value) ? value : [value]
  const seen = new Set<string>()
  const result: string[] = []

  for (const item of source) {
    const raw = String(item || '').trim()
    const key = normalizeEmailValue(raw)

    if (!raw || !key || seen.has(key)) continue

    seen.add(key)
    result.push(raw)
  }

  return result
}

export function isValidNotificationEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(email || '').trim()
  )
}

function extractSenderEmail(fromValue: string) {
  const value = String(fromValue || '').trim()

  if (!value) return ''

  const match = value.match(/<([^>]+)>/)

  return String(match?.[1] || value)
    .trim()
    .toLowerCase()
}

function normalizeBaseUrl(value: string) {
  return String(value || '')
    .trim()
    .replace(/\/+$/, '')
}

export function getNotificationEnvironmentStatus(): NotificationEnvironmentStatus {
  const resendApiKey = String(
    process.env.RESEND_API_KEY || ''
  ).trim()

  const fromValue = String(
    process.env.NOTIFICATION_FROM_EMAIL || ''
  ).trim()

  const senderEmail = extractSenderEmail(fromValue)

  const senderDomain =
    senderEmail.includes('@')
      ? senderEmail.split('@').pop() || ''
      : ''

  const replyTo = String(
    process.env.NOTIFICATION_REPLY_TO || ''
  ).trim()

  const directAppUrl = normalizeBaseUrl(
    String(process.env.NEXT_PUBLIC_APP_URL || '')
  )

  const vercelProductionHost = String(
    process.env.VERCEL_PROJECT_PRODUCTION_URL || ''
  ).trim()

  const vercelAppUrl = vercelProductionHost
    ? normalizeBaseUrl(`https://${vercelProductionHost}`)
    : ''

  const appUrl =
    directAppUrl ||
    vercelAppUrl ||
    'https://harmony-app-ten.vercel.app'

  return {
    resendApiKeyConfigured: Boolean(resendApiKey),
    fromConfigured:
      Boolean(fromValue) &&
      isValidNotificationEmail(senderEmail),
    fromValue,
    senderEmail,
    senderDomain,
    replyTo,
    appUrl,
  }
}

export async function getResendDomainDiagnostic(): Promise<ResendDomainDiagnostic> {
  const environment =
    getNotificationEnvironmentStatus()

  const resendApiKey = String(
    process.env.RESEND_API_KEY || ''
  ).trim()

  if (!resendApiKey) {
    return {
      checked: false,
      found: false,
      name: environment.senderDomain,
      status: 'missing_api_key',
      sendingCapability: '',
      message:
        'RESEND_API_KEY belum dikonfigurasi.',
    }
  }

  if (!environment.senderDomain) {
    return {
      checked: false,
      found: false,
      name: '',
      status: 'missing_sender_domain',
      sendingCapability: '',
      message:
        'Domain sender belum dapat dibaca dari NOTIFICATION_FROM_EMAIL.',
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    12000
  )

  try {
    const response = await fetch(
      'https://api.resend.com/domains',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        cache: 'no-store',
      }
    )

    const result = await response
      .json()
      .catch(() => null)

    if (!response.ok) {
      return {
        checked: true,
        found: false,
        name: environment.senderDomain,
        status: `http_${response.status}`,
        sendingCapability: '',
        message:
          result?.message ||
          'Resend Domain API belum dapat dibaca.',
      }
    }

    const domains = Array.isArray(result?.data)
      ? result.data
      : []

    const matched =
      domains.find((domain: any) => {
        return (
          normalizeEmailValue(domain?.name) ===
          normalizeEmailValue(
            environment.senderDomain
          )
        )
      }) || null

    if (!matched) {
      return {
        checked: true,
        found: false,
        name: environment.senderDomain,
        status: 'not_found',
        sendingCapability: '',
        message:
          `Domain ${environment.senderDomain} belum ditemukan pada akun Resend.`,
      }
    }

    const status = String(
      matched?.status || 'unknown'
    )

    const sendingCapability = String(
      matched?.capabilities?.sending || ''
    )

    return {
      checked: true,
      found: true,
      name: String(
        matched?.name ||
          environment.senderDomain
      ),
      status,
      sendingCapability,
      message:
        status === 'verified' &&
        sendingCapability !== 'disabled'
          ? 'Domain sender sudah verified dan siap mengirim email.'
          : `Domain ditemukan dengan status ${status}.`,
    }
  } catch (error: any) {
    return {
      checked: false,
      found: false,
      name: environment.senderDomain,
      status:
        error?.name === 'AbortError'
          ? 'timeout'
          : 'check_failed',
      sendingCapability: '',
      message:
        error?.name === 'AbortError'
          ? 'Pengecekan domain Resend melewati batas waktu.'
          : error?.message ||
            'Pengecekan domain Resend gagal.',
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function sendHarmonyServerEmail(
  payload: HarmonyServerEmailPayload
): Promise<HarmonyServerEmailResult> {
  const environment =
    getNotificationEnvironmentStatus()

  const resendApiKey = String(
    process.env.RESEND_API_KEY || ''
  ).trim()

  if (!resendApiKey) {
    return {
      ok: false,
      message:
        'RESEND_API_KEY belum diatur di environment variable.',
    }
  }

  if (!environment.fromConfigured) {
    return {
      ok: false,
      message:
        'NOTIFICATION_FROM_EMAIL belum diatur atau format sender belum valid.',
    }
  }

  const to = normalizeRecipients(payload.to)
  const cc = normalizeRecipients(payload.cc)
  const bcc = normalizeRecipients(payload.bcc)

  if (to.length === 0) {
    return {
      ok: false,
      message: 'Penerima email wajib diisi.',
    }
  }

  const allRecipients = [
    ...to,
    ...cc,
    ...bcc,
  ]

  if (allRecipients.length > 50) {
    return {
      ok: false,
      message:
        'Jumlah penerima email maksimal 50 alamat per pengiriman.',
    }
  }

  const invalidRecipients =
    allRecipients.filter(
      (email) =>
        !isValidNotificationEmail(email)
    )

  if (invalidRecipients.length > 0) {
    return {
      ok: false,
      message:
        `Format email tidak valid: ${invalidRecipients.join(', ')}`,
    }
  }

  const subject = String(
    payload.subject || ''
  ).trim()

  const html = String(
    payload.html || ''
  ).trim()

  const text = String(
    payload.text || ''
  ).trim()

  const replyTo = String(
    payload.replyTo ||
      environment.replyTo ||
      ''
  ).trim()

  if (!subject) {
    return {
      ok: false,
      message: 'Subject email wajib diisi.',
    }
  }

  if (!html && !text) {
    return {
      ok: false,
      message:
        'Isi email wajib tersedia minimal html atau text.',
    }
  }

  const resendPayload: Record<
    string,
    unknown
  > = {
    from: environment.fromValue,
    to,
    subject,
  }

  if (html) {
    resendPayload.html = html
  }

  if (text) {
    resendPayload.text = text
  }

  if (cc.length > 0) {
    resendPayload.cc = cc
  }

  if (bcc.length > 0) {
    resendPayload.bcc = bcc
  }

  if (
    replyTo &&
    isValidNotificationEmail(replyTo)
  ) {
    resendPayload.reply_to = replyTo
  }

  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    20000
  )

  try {
    const response = await fetch(
      'https://api.resend.com/emails',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resendPayload),
        signal: controller.signal,
      }
    )

    const result = await response
      .json()
      .catch(() => null)

    if (!response.ok) {
      return {
        ok: false,
        message:
          result?.message ||
          `Email gagal dikirim melalui Resend (HTTP ${response.status}).`,
        detail: result,
      }
    }

    return {
      ok: true,
      message:
        'Email berhasil dikirim melalui Resend.',
      providerId: result?.id || null,
      detail: result,
    }
  } catch (error: any) {
    return {
      ok: false,
      message:
        error?.name === 'AbortError'
          ? 'Pengiriman email melewati batas waktu 20 detik.'
          : error?.message ||
            'Terjadi kesalahan saat menghubungi Resend.',
    }
  } finally {
    clearTimeout(timeout)
  }
}

function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function buildServerHarmonyEmailHtml({
  title,
  message,
  actionLabel,
  actionUrl,
  footer,
}: {
  title: string
  message: string
  actionLabel?: string
  actionUrl?: string
  footer?: string
}) {
  const safeTitle = escapeHtml(title)
  const safeMessage = escapeHtml(
    message
  ).replace(/\n/g, '<br />')

  const safeActionLabel =
    escapeHtml(actionLabel || '')

  const safeActionUrl =
    escapeHtml(actionUrl || '')

  const safeFooter = escapeHtml(
    footer ||
      'Email ini dikirim otomatis oleh HARMONY. Mohon tidak membalas email ini.'
  )

  const button =
    actionLabel && actionUrl
      ? `
        <div style="margin-top:22px;">
          <a
            href="${safeActionUrl}"
            style="
              display:inline-block;
              background:#007aff;
              color:#ffffff;
              text-decoration:none;
              font-size:13px;
              font-weight:700;
              padding:12px 18px;
              border-radius:16px;
            "
          >
            ${safeActionLabel}
          </a>
        </div>
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

      <body
        style="
          margin:0;
          padding:0;
          background:#f5f5f7;
          font-family:Arial,Helvetica,sans-serif;
          color:#1d1d1f;
        "
      >
        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          style="
            padding:28px 12px;
            background:#f5f5f7;
          "
        >
          <tr>
            <td align="center">
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                style="
                  max-width:580px;
                  background:#ffffff;
                  border:1px solid #e5e5ea;
                  border-radius:28px;
                  overflow:hidden;
                "
              >
                <tr>
                  <td
                    style="
                      padding:24px 26px;
                      background:#111113;
                      color:#ffffff;
                    "
                  >
                    <div
                      style="
                        font-size:11px;
                        font-weight:700;
                        letter-spacing:.08em;
                        color:rgba(255,255,255,.62);
                        text-transform:uppercase;
                      "
                    >
                      HARMONY Notification
                    </div>

                    <div
                      style="
                        margin-top:8px;
                        font-size:22px;
                        font-weight:700;
                        line-height:1.25;
                      "
                    >
                      ${safeTitle}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding:24px 26px;
                      font-size:14px;
                      line-height:1.75;
                      color:#424245;
                    "
                  >
                    ${safeMessage}
                    ${button}
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding:16px 26px 24px;
                      color:#86868b;
                      font-size:11px;
                      line-height:1.6;
                      border-top:1px solid #f0f0f2;
                    "
                  >
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

export function buildServerHarmonyEmailText({
  title,
  message,
  actionLabel,
  actionUrl,
  footer,
}: {
  title: string
  message: string
  actionLabel?: string
  actionUrl?: string
  footer?: string
}) {
  const lines = [
    title,
    '',
    message,
  ]

  if (actionLabel && actionUrl) {
    lines.push(
      '',
      `${actionLabel}: ${actionUrl}`
    )
  }

  lines.push(
    '',
    footer ||
      'Email ini dikirim otomatis oleh HARMONY. Mohon tidak membalas email ini.'
  )

  return lines.join('\n')
}
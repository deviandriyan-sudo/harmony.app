import { NextResponse } from 'next/server'

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

function normalizeRecipients(value?: string | string[]) {
  if (!value) return []

  const list = Array.isArray(value) ? value : [value]

  return list
    .map((item) => String(item || '').trim())
    .filter(Boolean)
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function buildError(message: string, status = 400) {
  return NextResponse.json(
    {
      ok: false,
      message,
    },
    { status }
  )
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY
    const fromEmail = process.env.NOTIFICATION_FROM_EMAIL

    if (!apiKey) {
      return buildError('RESEND_API_KEY belum diatur di environment variable.', 500)
    }

    if (!fromEmail) {
      return buildError('NOTIFICATION_FROM_EMAIL belum diatur di environment variable.', 500)
    }

    const payload = (await request.json()) as SendEmailPayload

    const to = normalizeRecipients(payload.to)
    const cc = normalizeRecipients(payload.cc)
    const bcc = normalizeRecipients(payload.bcc)
    const subject = String(payload.subject || '').trim()
    const html = String(payload.html || '').trim()
    const text = String(payload.text || '').trim()
    const replyTo = String(payload.replyTo || '').trim()

    if (to.length === 0) {
      return buildError('Penerima email wajib diisi.')
    }

    const invalidEmails = [...to, ...cc, ...bcc].filter((email) => !isValidEmail(email))

    if (invalidEmails.length > 0) {
      return buildError(`Format email tidak valid: ${invalidEmails.join(', ')}`)
    }

    if (!subject) {
      return buildError('Subject email wajib diisi.')
    }

    if (!html && !text) {
      return buildError('Isi email wajib diisi minimal html atau text.')
    }

    const resendPayload: Record<string, unknown> = {
      from: fromEmail,
      to,
      subject,
    }

    if (html) resendPayload.html = html
    if (text) resendPayload.text = text
    if (cc.length > 0) resendPayload.cc = cc
    if (bcc.length > 0) resendPayload.bcc = bcc
    if (replyTo && isValidEmail(replyTo)) resendPayload.reply_to = replyTo

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendPayload),
    })

    const result = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: result?.message || 'Email gagal dikirim melalui Resend.',
          detail: result,
        },
        { status: response.status || 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      message: 'Email berhasil dikirim.',
      data: result,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        message: error?.message || 'Terjadi kesalahan saat mengirim email.',
      },
      { status: 500 }
    )
  }
}
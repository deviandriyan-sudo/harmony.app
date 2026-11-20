/** Parse Supabase password recovery callbacks without trusting arbitrary active sessions.
 * Supports OTP token_hash links, PKCE `code` links and implicit hash links.
 * No token is logged or sent to an unrelated origin.
 */
export type RecoveryCallback =
  | { kind: 'error'; message: string }
  | { kind: 'otp'; tokenHash: string }
  | { kind: 'pkce'; code: string }
  | { kind: 'implicit'; accessToken: string; refreshToken: string }
  | { kind: 'session-marker' }
  | { kind: 'none' }

export function parseRecoveryCallback(href: string): RecoveryCallback {
  const url = new URL(href)
  const hash = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash)
  const query = url.searchParams
  const error = query.get('error_description') || hash.get('error_description')
    || query.get('error') || hash.get('error')
  if (error) return { kind: 'error', message: error.slice(0, 300) }

  const tokenHash = query.get('token_hash') || hash.get('token_hash')
  const tokenType = query.get('type') || hash.get('type')
  if (tokenHash && tokenType === 'recovery') return { kind: 'otp', tokenHash }

  const code = query.get('code')
  if (code) return { kind: 'pkce', code }

  const accessToken = hash.get('access_token')
  const refreshToken = hash.get('refresh_token')
  if (accessToken && refreshToken && tokenType === 'recovery') {
    return { kind: 'implicit', accessToken, refreshToken }
  }

  // A marker is included by HARMONY when requesting new recovery links.
  // It is not authentication: a valid, verified session is still mandatory.
  if (query.get('flow') === 'recovery') return { kind: 'session-marker' }
  return { kind: 'none' }
}

export function clearRecoveryCredentialsFromUrl(href: string): string {
  const url = new URL(href)
  url.searchParams.delete('code')
  url.searchParams.delete('token_hash')
  url.searchParams.delete('type')
  url.searchParams.delete('error')
  url.searchParams.delete('error_description')
  url.hash = ''
  return `${url.pathname}${url.search}`
}

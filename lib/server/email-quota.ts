/** Do not burn all remaining queue retries while Resend reports a daily quota.
 * Resend may use account-specific reset windows; retry conservatively in 24h. */
export function isDailyEmailQuotaError(message: string): boolean {
  const value = String(message || '').toLowerCase()
  return /(?:daily|per.day|24.hour).{0,60}(?:quota|limit|sending)|(?:quota|limit).{0,60}(?:daily|per.day|24.hour)/i.test(value)
}
export function quotaRetryAt(now = Date.now()): string {
  return new Date(now + 24 * 60 * 60 * 1000).toISOString()
}

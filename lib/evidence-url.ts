/** Legacy links are untrusted database values. Accept only this project's Storage origin. */
export const EVIDENCE_BUCKETS = ['leave-attachments', 'phl-proofs'] as const
export type EvidenceBucket = typeof EVIDENCE_BUCKETS[number]

export function validEvidenceObjectPath(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 1024 &&
    !/[\x00-\x1f\x7f\\%?#]/.test(value) &&
    value.split('/').every(part => part.length > 0 && part !== '.' && part !== '..')
}

export function parseLegacyEvidenceUrl(value: unknown, configuredOrigin: string | undefined): { bucket: EvidenceBucket; path: string; url: string } | null {
  if (typeof value !== 'string' || !configuredOrigin) return null
  const raw = value.trim()
  if (!raw || /[\x00-\x1f\x7f\\]/.test(raw) || /%(?:2f|5c|2e|25)/i.test(raw)) return null
  try {
    const base = new URL(configuredOrigin)
    const parsed = new URL(raw)
    if (base.protocol !== 'https:' || parsed.origin !== base.origin || parsed.username || parsed.password || parsed.search || parsed.hash) return null
    for (const bucket of EVIDENCE_BUCKETS) {
      const prefix = `${base.origin}/storage/v1/object/public/${bucket}/`
      if (!raw.startsWith(prefix)) continue
      const path = decodeURIComponent(raw.slice(prefix.length))
      if (!validEvidenceObjectPath(path)) return null
      return { bucket, path, url: parsed.href }
    }
  } catch { return null }
  return null
}

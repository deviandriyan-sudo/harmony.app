/** Preserve employee-uploaded files referenced by historical/active PHL evidence. */
import type { SupabaseClient } from '@supabase/supabase-js'

export const PHL_EVIDENCE_BUCKET = 'leave-attachments'

/** Storage URLs are untrusted legacy data: accept only the configured Supabase host and known bucket. */
export function phlStoragePathFromPublicUrl(value: unknown): string | null {
  const raw = String(value || '').trim()
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!raw || !configured) return null
  try {
    const url = new URL(raw)
    const base = new URL(configured)
    if (url.origin !== base.origin || url.username || url.password) return null
    const marker = `/storage/v1/object/public/${PHL_EVIDENCE_BUCKET}/`
    if (!url.pathname.startsWith(marker)) return null
    const objectPath = decodeURIComponent(url.pathname.slice(marker.length))
    if (!objectPath || objectPath.startsWith('/') || objectPath.split('/').some(part => part === '.' || part === '..')) return null
    return objectPath
  } catch {
    return null
  }
}

/** Never delete storage evidence if linked to PHL, or if reference checks fail. */
export async function unreferencedAttendanceProofPaths(
  admin: SupabaseClient,
  paths: string[],
  originalUrls: unknown[],
): Promise<string[]> {
  const normalizedPaths = [...new Set(paths.map(value => String(value || '').trim()).filter(Boolean))]
  if (normalizedPaths.length === 0) return []
  const urls = [...new Set(originalUrls.map(value => String(value || '').trim()).filter(Boolean))]
  // Existing references can store either a direct Storage path or the historical public URL.
  const [byPath, byLegacy] = await Promise.all([
    admin.from('phl_work_request_attachments').select('storage_path,legacy_file_url')
      .in('storage_path', normalizedPaths),
    urls.length
      ? admin.from('phl_work_request_attachments').select('storage_path,legacy_file_url')
          .in('legacy_file_url', urls)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (byPath.error || byLegacy.error) {
    // Fail closed: preserving an orphan temporarily is safer than deleting approved PHL evidence.
    return []
  }
  const protectedPaths = new Set<string>()
  for (const record of [...(byPath.data || []), ...(byLegacy.data || [])]) {
    if (record.storage_path) protectedPaths.add(record.storage_path)
    const legacyPath = phlStoragePathFromPublicUrl(record.legacy_file_url)
    if (legacyPath) protectedPaths.add(legacyPath)
  }
  return normalizedPaths.filter(path => !protectedPaths.has(path))
}

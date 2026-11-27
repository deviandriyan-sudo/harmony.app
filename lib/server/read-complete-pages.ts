/** Read-only bounded pagination for existing full-list contracts. A changing
 * count, a repeated ID or an exceeded limit is an explicit error, never a
 * successful partial list. Use a deterministic unique order in each query. */
export const COMPLETE_PAGE_SIZE = 250
export const COMPLETE_READ_MAX = 5_000

type Page<T> = { data: T[] | null; error: unknown; count: number | null }
export async function readCompletePages<T extends { id?: unknown }>(
  fetchPage: (from: number, to: number) => PromiseLike<Page<T>>,
  label: string,
  maxRows = COMPLETE_READ_MAX,
): Promise<T[]> {
  const result: T[] = []
  const seen = new Set<string>()
  let expected: number | null = null
  for (let offset = 0; ; offset = result.length) {
    const page = await fetchPage(offset, offset + COMPLETE_PAGE_SIZE - 1)
    if (page.error) throw page.error
    if (page.count === null || !Number.isSafeInteger(page.count) || page.count < 0 || !Array.isArray(page.data)) throw new Error(`${label}: jumlah data tidak dapat diverifikasi.`)
    if (page.count > maxRows) throw Object.assign(new Error(`${label}: data melebihi batas pembacaan aman. Hubungi HR untuk pembacaan laporan lengkap.`), { status: 409 })
    if (expected !== null && expected !== page.count) throw Object.assign(new Error(`${label}: data berubah ketika dibaca. Muat ulang.`), { status: 409 })
    expected = page.count
    for (const row of page.data) {
      if (typeof row.id !== 'string' || !row.id || seen.has(row.id)) throw Object.assign(new Error(`${label}: halaman data tidak konsisten. Muat ulang.`), { status: 409 })
      seen.add(row.id)
      result.push(row)
    }
    if (result.length === expected) return result
    if (result.length > expected || page.data.length === 0 || page.data.length > COMPLETE_PAGE_SIZE) throw Object.assign(new Error(`${label}: pembacaan tidak lengkap. Muat ulang.`), { status: 409 })
  }
}

export async function readIdBatches<T>(ids: string[], read: (batch: string[]) => Promise<T[]>, size = 100): Promise<T[]> {
  const unique = [...new Set(ids.filter(Boolean))]
  const rows: T[] = []
  for (let offset = 0; offset < unique.length; offset += size) rows.push(...await read(unique.slice(offset, offset + size)))
  return rows
}

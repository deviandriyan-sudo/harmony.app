/** Read a bounded, deterministically ordered collection without silently
 * accepting a PostgREST row cap, duplicate keys or a changing row count.
 * This is not a cross-request transaction snapshot; writes still require RPCs. */
export async function readCompleteRows<T extends { id?: unknown }>(
  read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown; count: number | null }>,
  maxRows = 10_000,
  pageSize = 500,
): Promise<T[]> {
  const rows: T[] = []
  const seen = new Set<string>()
  let expected: number | null = null
  for (;;) {
    const result = await read(rows.length, rows.length + pageSize - 1)
    if (result.error) throw result.error
    if (!Array.isArray(result.data) || result.count === null || !Number.isSafeInteger(result.count) || result.count < 0 || result.count > maxRows) {
      throw Object.assign(new Error('Jumlah data tidak dapat diverifikasi atau melebihi batas baca. Persempit rentang data.'), { status: 409 })
    }
    if (expected === null) expected = result.count
    if (expected !== result.count || rows.length + result.data.length > expected) {
      throw Object.assign(new Error('Data berubah saat dibaca. Muat ulang.'), { status: 409 })
    }
    for (const row of result.data) {
      const id = String(row.id ?? '')
      if (!id || seen.has(id)) throw Object.assign(new Error('Data memiliki identitas berulang atau tidak lengkap. Muat ulang.'), { status: 409 })
      seen.add(id)
      rows.push(row)
    }
    if (rows.length === expected) return rows
    if (!result.data.length) throw Object.assign(new Error('Data belum lengkap. Muat ulang.'), { status: 409 })
  }
}

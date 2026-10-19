'use client'

import * as XLSX from 'xlsx'

type ReportValue = string | number | boolean | null | undefined
export type ReportRow = Record<string, ReportValue>
export type StyledSheet = { name: string; rows: ReportRow[]; columns?: string[]; widths?: Record<string, number> }

/**
 * Shared client-side XLSX renderer for HARMONY. The community SheetJS writer
 * silently ignores cell color/styles. We add standard OOXML cell styles to the
 * file it writes, using the CFB/ZIP utility already bundled with SheetJS.
 * No new package, external service, or backend query is required.
 */
export function downloadStyledWorkbook(filename: string, sheets: StyledSheet[]) {
  const workbook = XLSX.utils.book_new()
  const styling: Array<{ headers: string[]; rows: ReportRow[] }> = []

  for (const sheet of sheets) {
    const headers = sheet.columns?.length ? sheet.columns : Object.keys(sheet.rows[0] || { Keterangan: '' })
    const bodyRows = sheet.rows.length ? sheet.rows : [{ [headers[0]]: 'Tidak ada data untuk filter ini.' }]
    const values = [headers, ...bodyRows.map((row) => headers.map((key) => sanitizeSpreadsheetValue(row[key])))]
    const ws = XLSX.utils.aoa_to_sheet(values)
    ws['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(headers.length - 1)}${values.length}` }
    ws['!cols'] = headers.map((header) => ({ wch: sheet.widths?.[header] || recommendedWidth(header, bodyRows) }))
    XLSX.utils.book_append_sheet(workbook, ws, sheet.name.slice(0, 31))
    styling.push({ headers, rows: bodyRows })
  }

  const cfb = (XLSX as unknown as { CFB: any }).CFB
  const initial = XLSX.write(workbook, { type: 'binary', bookType: 'xlsx', compression: true })
  const archive = cfb.read(initial, { type: 'binary' })
  replacePart(cfb, archive, 'xl/styles.xml', STYLES_XML)

  styling.forEach(({ headers, rows }, index) => {
    const path = `xl/worksheets/sheet${index + 1}.xml`
    const source = getPart(cfb, archive, path)
    if (!source) throw new Error(`XLSX: bagian ${path} tidak ditemukan`)
    const updated = source
      .replace(/<sheetView workbookViewId="0"\s*\/>/, '<sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView>')
      .replace(/<c\s+r="([A-Z]+)(\d+)"([^>]*)>/g, (match, col: string, rowText: string, attrs: string) => {
        if (/\ss=/.test(attrs)) return match
        const rowNum = Number(rowText)
        const colNum = XLSX.utils.decode_col(col)
        const heading = headers[colNum] || ''
        const value = rowNum > 1 ? rows[rowNum - 2]?.[heading] : heading
        const style = rowNum === 1 ? 1 : cellStyle(heading, value, rows[rowNum - 2] || {}, rowNum)
        return `<c r="${col}${rowText}" s="${style}"${attrs}>`
      })
    replacePart(cfb, archive, path, updated)
  })

  const binary = cfb.write(archive, { type: 'binary', fileType: 'zip', compression: true }) as string
  const output = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([output], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export function downloadRawCsv(filename: string, rows: ReportRow[]) {
  const headers = Object.keys(rows[0] || {})
  const escape = (value: unknown) => `"${String(sanitizeSpreadsheetValue(value as ReportValue)).replaceAll('"', '""')}"`
  const csv = [headers.map(escape).join(','), ...rows.map((row) => headers.map((h) => escape(row[h])).join(','))].join('\r\n')
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 5000)
}

function sanitizeSpreadsheetValue(value: ReportValue) {
  if (typeof value !== 'string') return value ?? ''
  // Avoid formula injection in both XLSX and CSV exports.
  return /^[=+@\-\t\r]/.test(value) && !/^\d{4}-\d{2}-\d{2}$/.test(value) ? `'${value}` : value
}

function recommendedWidth(heading: string, rows: ReportRow[]) {
  const sampled = rows.slice(0, 50)
  const size = Math.max(heading.length + 3, ...sampled.map((row) => String(row[heading] ?? '').length + 2))
  return Math.min(43, Math.max(13, size))
}

function cellStyle(heading: string, value: ReportValue, row: ReportRow, rowNumber: number) {
  const label = heading.toLowerCase()
  const normalized = String(value ?? '').trim().toLowerCase()
  const base = rowNumber % 2 === 0 ? 0 : 2
  if (/nominal|plafond|saldo.*rp|biaya|total dibayar|jumlah.*rp|amount|total.*klaim/i.test(label) && typeof value === 'number') return 11
  if (/terlambat|pulang cepat/.test(label) && value !== '' && value != null && (normalized === 'ya' || Number(value) > 0)) return 4
  if (/manual|koreksi/.test(label) && !/pending/.test(label) && normalized && normalized !== '-' && normalized !== 'tidak' && normalized !== '0') return 5
  if (/libur|weekend|sabtu|minggu|hari non-kerja/.test(label) && normalized !== '' && normalized !== 'tidak' && normalized !== '-') return 8
  if (/phl|postpone/.test(label) && normalized && normalized !== '-' && normalized !== 'tidak' && normalized !== '0') return 6
  if (/klasifikasi|keterangan|status|approval|workflow|jenis|hari|sumber kehadiran|source|catatan/.test(label)) {
    if (/(alpa|tanpa data|konflik|rejected|ditolak|deleted|batal|cancelled|incomplete|tidak hadir|gagal)/.test(normalized)) return 7
    if (/(terlambat|late|pending|menunggu|belum|perlu review|diajukan)/.test(normalized)) return 4
    if (/(manual|koreksi|fingerprint.*manual)/.test(normalized)) return 5
    if (/(phl|cuti|izin|sakit|leave|permit)/.test(normalized)) return 6
    if (/(approved|disetujui|finalized|paid|hadir|present|selesai|berhasil|tercatat)/.test(normalized)) return 3
    if (/(holiday|libur|weekend|sabtu|minggu)/.test(normalized)) return 8
    if (/(travel|surat tugas|dinas|lapangan|st\b)/.test(normalized)) return 9
  }
  // Keep numeric and blank cells in soft alternating rows.
  if (String(row['Terlambat'] || '').toUpperCase() === 'YA' && /check in efektif/i.test(heading)) return 4
  return base
}

function getPart(cfb: any, archive: any, path: string): string {
  const found = cfb.find(archive, `Root Entry/${path}`)
  if (!found?.content) return ''
  return new TextDecoder().decode(found.content instanceof Uint8Array ? found.content : new Uint8Array(found.content))
}
function replacePart(cfb: any, archive: any, path: string, content: string) {
  const file = cfb.find(archive, `Root Entry/${path}`)
  if (!file) throw new Error(`XLSX: bagian ${path} tidak ditemukan`)
  const bytes = new TextEncoder().encode(content)
  file.content = bytes
  file.size = bytes.byteLength
}


// Standard SpreadsheetML styles; worksheet cells refer to xf indices below.
const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;Rp&quot; #,##0;[Red](&quot;Rp&quot; #,##0)"/></numFmts>
<fonts count="8">
<font><sz val="10"/><color rgb="FF23334C"/><name val="Aptos"/></font>
<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font>
<font><b/><sz val="10"/><color rgb="FF145D36"/><name val="Aptos"/></font>
<font><b/><sz val="10"/><color rgb="FF995D0A"/><name val="Aptos"/></font>
<font><b/><sz val="10"/><color rgb="FF1C57A2"/><name val="Aptos"/></font>
<font><b/><sz val="10"/><color rgb="FF6636A2"/><name val="Aptos"/></font>
<font><b/><sz val="10"/><color rgb="FFA62C43"/><name val="Aptos"/></font>
<font><b/><sz val="10"/><color rgb="FF196F6A"/><name val="Aptos"/></font>
</fonts>
<fills count="10">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF193C65"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF2F7FC"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE6F5EB"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFF0D4"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE7F1FF"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF2EAFB"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFDE6E8"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE1F6F3"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="hair"><color rgb="FFDDE7F1"/></left><right/><top/><bottom style="hair"><color rgb="FFDDE7F1"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="12">
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0"/>
<xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0"/>
<xf numFmtId="0" fontId="3" fillId="5" borderId="1" xfId="0"/>
<xf numFmtId="0" fontId="4" fillId="6" borderId="1" xfId="0"/>
<xf numFmtId="0" fontId="5" fillId="7" borderId="1" xfId="0"/>
<xf numFmtId="0" fontId="6" fillId="8" borderId="1" xfId="0"/>
<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0"/>
<xf numFmtId="0" fontId="7" fillId="9" borderId="1" xfId="0"/>
<xf numFmtId="0" fontId="4" fillId="6" borderId="1" xfId="0"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

/** Attendance export helpers. Never change payroll classifications or approval states. */
export function minutesBetween(inTime: string | null | undefined, outTime: string | null | undefined): number | '' {
  const start = parseClock(inTime)
  const end = parseClock(outTime)
  if (start == null || end == null) return ''
  const minutes = end < start ? end + 1440 - start : end - start
  return minutes >= 0 && minutes <= 1440 ? minutes : ''
}

/**
 * Informational estimate ONLY for days already marked late by the attendance
 * source. The 08:00 office reference is not a payroll rule and cannot capture
 * other shifts; do not calculate lateness for unflagged/holiday rows.
 */
export function estimatedLateMinutes(isLate: boolean, effectiveIn: string | null | undefined, offday = false): number | '' {
  if (!isLate || offday) return ''
  const actual = parseClock(effectiveIn)
  if (actual == null || actual <= 8 * 60) return ''
  return actual - 8 * 60
}

export function lateDescription(isLate: boolean, effectiveIn: string | null | undefined, offday = false) {
  if (!isLate) return 'Tidak ditandai terlambat'
  const estimate = estimatedLateMinutes(isLate, effectiveIn, offday)
  return estimate === '' ? 'Terlambat menurut mesin; periksa jadwal kerja' : `Terlambat menurut mesin; estimasi ${estimate} menit dari 08.00 (verifikasi shift)`
}

function parseClock(input: string | null | undefined): number | null {
  const match = String(input || '').match(/(?:^|\s)(\d{1,2}):(\d{2})(?::\d{2})?(?:\s|$)/)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  return hour <= 23 && minute <= 59 ? hour * 60 + minute : null
}

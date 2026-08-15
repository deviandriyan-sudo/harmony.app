'use client'

import { useCallback, useEffect, useState } from 'react'
import { getCurrentPeriodMonthWita } from '@/lib/attendance-reporting'

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/

export function isValidAttendancePeriod(value: string | null | undefined) {
  return Boolean(value && PERIOD_RE.test(value) && value >= '2026-01')
}

/**
 * Single source of truth untuk period selector HR Attendance.
 * - pertama kali baca ?period=YYYY-MM dari URL
 * - jika tidak ada, gunakan periode cutoff WITA berjalan
 * - setiap selector berubah, URL ikut di-replace tanpa reload
 * - query param lain (q/filter) tetap dipertahankan
 */
export function useAttendancePeriodQuery() {
  const [periodMonth, setPeriodMonthState] = useState(getCurrentPeriodMonthWita())
  const [periodReady, setPeriodReady] = useState(false)

  useEffect(() => {
    const fallback = getCurrentPeriodMonthWita()

    if (typeof window === 'undefined') {
      setPeriodReady(true)
      return
    }

    const url = new URL(window.location.href)
    const queryPeriod = url.searchParams.get('period')
    const initialPeriod = isValidAttendancePeriod(queryPeriod)
      ? String(queryPeriod)
      : fallback

    setPeriodMonthState(initialPeriod)

    if (queryPeriod !== initialPeriod) {
      url.searchParams.set('period', initialPeriod)
      window.history.replaceState(
        window.history.state,
        '',
        `${url.pathname}${url.search}${url.hash}`,
      )
    }

    setPeriodReady(true)
  }, [])

  const setPeriodMonth = useCallback((nextPeriod: string) => {
    if (!isValidAttendancePeriod(nextPeriod)) return

    setPeriodMonthState(nextPeriod)

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('period', nextPeriod)
      window.history.replaceState(
        window.history.state,
        '',
        `${url.pathname}${url.search}${url.hash}`,
      )
    }
  }, [])

  return { periodMonth, setPeriodMonth, periodReady }
}

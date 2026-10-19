'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getCutoffRange } from '@/lib/attendance-reporting'
import {
  buildAttendanceReportingRows,
  loadAttendanceReportingDataset,
  type AttendanceReportingDataset,
} from '@/lib/attendance-reporting-data'
import { supabase } from '@/lib/supabase'
import { useAttendancePeriodQuery } from '@/lib/use-attendance-period'

/** Shared read-only reporting query. The HR review action remains in its existing detail route. */
export function useHRAttendanceReporting(errorFallback: string) {
  const { periodMonth, setPeriodMonth, periodReady } = useAttendancePeriodQuery()
  const [dataset, setDataset] = useState<AttendanceReportingDataset | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const requestSequence = useRef(0)

  const range = useMemo(() => getCutoffRange(periodMonth), [periodMonth])
  const rows = useMemo(
    () => dataset ? buildAttendanceReportingRows(dataset, periodMonth) : [],
    [dataset, periodMonth],
  )
  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return rows
    return rows.filter(({employee}) => [
      employee.full_name, employee.employee_number, employee.machine_pin,
      employee.department, employee.position,
    ].filter(Boolean).join(' ').toLowerCase().includes(keyword))
  }, [rows, search])

  const fetchData = useCallback(async () => {
    const requestId = ++requestSequence.current
    setLoading(true)
    setErrorMessage('')
    try {
      const result = await loadAttendanceReportingDataset(supabase, periodMonth)
      if (requestSequence.current === requestId) setDataset(result)
    } catch (error: unknown) {
      if (requestSequence.current === requestId) {
        setDataset(null)
        setErrorMessage(error instanceof Error ? error.message : errorFallback)
      }
    } finally {
      if (requestSequence.current === requestId) setLoading(false)
    }
  }, [periodMonth, errorFallback])

  useEffect(() => {
    if (!periodReady) return
    void fetchData()
    return () => { requestSequence.current += 1 }
  }, [fetchData, periodReady])

  return {
    periodMonth, setPeriodMonth, periodReady, dataset, search, setSearch,
    loading, errorMessage, setErrorMessage, range, rows, filteredRows, fetchData,
  }
}

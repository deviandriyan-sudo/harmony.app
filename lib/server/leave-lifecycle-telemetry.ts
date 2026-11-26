import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

const EVENT_TYPE = 'scheduled_lifecycle_run'
const SOURCE = 'harmony_scheduler'

export type LeaveLifecycleRun = {
  reference_date: string
  environment: string
  succeeded: boolean
  processed_count: number
  failed_count: number
  remaining_count: number
  created_cycles: number
  expired_postpone_count: number
  error_codes: Record<string, number>
}

export async function recordLeaveLifecycleRun(admin: SupabaseClient, run: LeaveLifecycleRun) {
  const { reference_date, ...metadata } = run
  // One run event, in the existing lifecycle audit ledger. No employee identity.
  return admin.from('leave_lifecycle_audit_logs').insert({
    event_type: EVENT_TYPE,
    source_table: SOURCE,
    source_id: randomUUID(),
    reference_date,
    metadata,
  })
}

export async function readLatestLeaveLifecycleRun(admin: SupabaseClient) {
  const { data, error } = await admin.from('leave_lifecycle_audit_logs')
    .select('reference_date,metadata,created_at')
    .eq('event_type', EVENT_TYPE)
    .eq('source_table', SOURCE)
    .is('employee_id', null)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1).maybeSingle()
  if (error || !data) return { data: null, error }
  const m = data.metadata as Partial<Omit<LeaveLifecycleRun, 'reference_date'>> | null
  if (!m || typeof m.succeeded !== 'boolean' || typeof m.environment !== 'string' ||
    ![m.processed_count, m.failed_count, m.remaining_count, m.created_cycles, m.expired_postpone_count]
      .every(v => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0)) {
    return { data: null, error: { code: 'HARMONY_INVALID_RUN_TELEMETRY', message: 'Invalid lifecycle run metadata.' } }
  }
  return {
    data: {
      reference_date: data.reference_date,
      environment: m.environment,
      succeeded: m.succeeded,
      processed_count: m.processed_count,
      failed_count: m.failed_count,
      remaining_count: m.remaining_count,
      created_cycles: m.created_cycles,
      expired_postpone_count: m.expired_postpone_count,
      created_at: data.created_at,
    },
    error: null,
  }
}

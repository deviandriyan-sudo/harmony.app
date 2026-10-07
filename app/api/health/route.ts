import { NextRequest, NextResponse } from 'next/server'

import { HARMONY_APP_VERSION, HARMONY_REQUIRED_SCHEMA_VERSION } from '@/lib/version'
import { apiError, requireHRApi } from '@/lib/server/hr-api-auth'
import { REMED_BUCKET, REMED_SIGNATURE_BUCKET } from '@/lib/remed'

export const dynamic = 'force-dynamic'

type CheckStatus = 'ok' | 'warning' | 'error'

type HealthCheck = {
  key: string
  label: string
  status: CheckStatus
  detail: string
}

export async function GET(request: NextRequest) {
  try {
    const { admin } = await requireHRApi(request)
    const checks: HealthCheck[] = []

    const schemaResult = await admin.rpc('harmony_health_snapshot_v3')
    const snapshot = !schemaResult.error && schemaResult.data && typeof schemaResult.data === 'object'
      ? schemaResult.data as Record<string, unknown>
      : null

    const databaseVersion = String(snapshot?.schema_version || '')
    const schemaCompatible = databaseVersion === HARMONY_REQUIRED_SCHEMA_VERSION

    checks.push({
      key: 'schema_version',
      label: 'Database schema',
      status: schemaCompatible ? 'ok' : 'error',
      detail: schemaCompatible
        ? `Schema ${databaseVersion} kompatibel dengan aplikasi ${HARMONY_APP_VERSION}.`
        : schemaResult.error
          ? 'Health RPC belum tersedia. Jalankan migration Stability V3.'
          : `Aplikasi membutuhkan schema ${HARMONY_REQUIRED_SCHEMA_VERSION}, database terdeteksi ${databaseVersion || 'unknown'}.`,
    })

    if (snapshot) {
      const requiredSnapshotChecks = [
        ['employees_table', 'Master Karyawan', 'employees'],
        ['app_users_table', 'HARMONY Users', 'app_users'],
        ['phl_records_table', 'PHL Canonical', 'phl_records'],
        ['remed_claims_table', 'Re-Med Claims', 'remed_claims'],
        ['remed_entitlements_table', 'Re-Med Entitlements', 'remed_entitlements'],
        ['phl_balance_rpc', 'PHL Balance RPC', 'get_my_phl_balance_summary'],
        ['remed_submit_rpc', 'Re-Med Submit RPC', 'remed_submit_claim_v1'],
        ['remed_hr_review_rpc', 'Re-Med HR Review RPC', 'remed_hr_review_claim_v1'],
        ['remed_finance_review_rpc', 'Re-Med Finance Review RPC', 'remed_finance_review_claim_v1'],
      ] as const

      for (const [key, label, objectName] of requiredSnapshotChecks) {
        const exists = snapshot[key] === true
        checks.push({
          key,
          label,
          status: exists ? 'ok' : 'error',
          detail: exists ? `${objectName} tersedia.` : `${objectName} tidak ditemukan pada database aktif.`,
        })
      }
    }

    const [employees, phlRecords, phlWorkRequests, remedClaims, remedEntitlements, phlWorkRpc] = await Promise.all([
      admin.from('employees').select('id', { count: 'exact', head: true }),
      admin.from('phl_records').select('id', { count: 'exact', head: true }),
      admin.from('phl_work_requests').select('id', { count: 'exact', head: true }),
      admin.from('remed_claims').select('id', { count: 'exact', head: true }),
      admin.from('remed_entitlements').select('id', { count: 'exact', head: true }),
      admin.rpc('harmony_review_phl_work_request_v1', {
        p_request_id: '00000000-0000-0000-0000-000000000000',
        p_action: 'approve',
        p_supervisor_id: '00000000-0000-0000-0000-000000000000',
        p_supervisor_name: 'health-check',
        p_supervisor_email: null,
        p_note: 'health-check',
      }),
    ])

    const rowChecks = [
      ['employees_rows', 'Master Karyawan', employees, 'employee'],
      ['phl_rows', 'PHL Records', phlRecords, 'record'],
      ['phl_work_rows', 'PHL Work Requests', phlWorkRequests, 'request'],
      ['remed_claim_rows', 'Re-Med Claims', remedClaims, 'claim'],
      ['remed_entitlement_rows', 'Re-Med Entitlements', remedEntitlements, 'entitlement'],
    ] as const

    for (const [key, label, result, noun] of rowChecks) {
      checks.push({
        key,
        label,
        status: result.error ? 'error' : 'ok',
        detail: result.error ? result.error.message : `${result.count ?? 0} ${noun} terbaca.`,
      })
    }


    checks.push({
      key: 'phl_work_review_rpc',
      label: 'PHL Independent Approval RPC',
      status: phlWorkRpc.error ? 'error' : 'ok',
      detail: phlWorkRpc.error
        ? phlWorkRpc.error.message
        : 'harmony_review_phl_work_request_v1 tersedia.',
    })

    const [receiptBucket, signatureBucket] = await Promise.all([
      admin.storage.getBucket(REMED_BUCKET),
      admin.storage.getBucket(REMED_SIGNATURE_BUCKET),
    ])

    checks.push({
      key: 'remed_receipt_bucket',
      label: 'Storage Kuitansi Re-Med',
      status: receiptBucket.error ? 'error' : receiptBucket.data?.public ? 'warning' : 'ok',
      detail: receiptBucket.error
        ? `Bucket ${REMED_BUCKET} tidak terbaca.`
        : receiptBucket.data?.public
          ? `Bucket ${REMED_BUCKET} masih public.`
          : `Bucket ${REMED_BUCKET} private dan tersedia.`,
    })

    checks.push({
      key: 'remed_signature_bucket',
      label: 'Storage Tanda Tangan',
      status: signatureBucket.error ? 'warning' : signatureBucket.data?.public ? 'warning' : 'ok',
      detail: signatureBucket.error
        ? `Bucket ${REMED_SIGNATURE_BUCKET} tidak terbaca atau fitur tanda tangan belum aktif.`
        : signatureBucket.data?.public
          ? `Bucket ${REMED_SIGNATURE_BUCKET} masih public.`
          : `Bucket ${REMED_SIGNATURE_BUCKET} private dan tersedia.`,
    })

    checks.push({
      key: 'supabase_server_env',
      label: 'Supabase Server Environment',
      status: process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? 'ok' : 'error',
      detail: process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
        ? 'Server environment Supabase tersedia.'
        : 'Environment Supabase server belum lengkap.',
    })

    checks.push({
      key: 'resend_env',
      label: 'Email Provider',
      status: process.env.RESEND_API_KEY ? 'ok' : 'warning',
      detail: process.env.RESEND_API_KEY
        ? 'RESEND_API_KEY tersedia. Delivery/domain tetap diperiksa dari Diagnostik Email.'
        : 'RESEND_API_KEY belum tersedia.',
    })

    const hasError = checks.some((check) => check.status === 'error')
    const hasWarning = checks.some((check) => check.status === 'warning')

    return NextResponse.json({
      status: hasError ? 'error' : hasWarning ? 'warning' : 'ok',
      appVersion: HARMONY_APP_VERSION,
      requiredSchemaVersion: HARMONY_REQUIRED_SCHEMA_VERSION,
      databaseVersion: databaseVersion || null,
      checkedAt: new Date().toISOString(),
      checks,
    })
  } catch (error) {
    const result = apiError(error, 'Gagal menjalankan System Health HARMONY.')
    return NextResponse.json({ message: result.message }, { status: result.status })
  }
}

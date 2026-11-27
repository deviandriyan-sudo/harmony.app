import { NextRequest, NextResponse } from 'next/server'
import { requireHarmonyApi } from '@/lib/server/user-api-auth'
import { getPHLSubordinateIds } from '@/lib/server/phl-work'
import { deriveApprovalStage } from '@/lib/leave-workflow-status'
import { cleanStatus, witaToday } from '@/lib/dashboard-monitoring'
import { phlWorkApprovalExpired } from '@/lib/phl-work-expiry'
import type { DashboardApprovalItem } from '@/lib/dashboard-approval-types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { admin, employee } = await requireHarmonyApi(request)
    const headers = { 'Cache-Control': 'private, no-store' }
    if (!employee) return NextResponse.json({ items: [], total: 0, blockedTotal: 0 }, { headers })
    const ids = await getPHLSubordinateIds(admin, employee)
    if (!ids.length) return NextResponse.json({ items: [], total: 0, blockedTotal: 0 }, { headers })
    const today = witaToday()
    const month = today.slice(0, 7)
    const [staff, attendance, leaves, work, claims] = await Promise.all([
      admin.from('employees').select('id,full_name').in('id', ids),
      admin.from('attendance_period_confirmations')
        .select('id,employee_id,employee_status,supervisor_status,period_month,employee_submitted_at')
        .in('employee_id', ids).eq('period_month', month).limit(500),
      admin.from('leave_requests')
        .select('id,employee_id,request_type,leave_type,status,supervisor_status,hr_status,start_date,end_date,total_days,reason,created_at')
        .in('employee_id', ids).neq('request_type', 'phl_claim').order('created_at', { ascending: false }).limit(250),
      admin.from('phl_work_requests')
        .select('id,employee_id,work_date,status,supervisor_status,work_purpose,work_start_time,work_end_time,requested_work_minutes,origin,created_at')
        .in('employee_id', ids).order('created_at', { ascending: false }).limit(250),
      admin.from('phl_records')
        .select('id,employee_id,phl_date,reason,source,status,supervisor_status,hr_status,created_at')
        .in('employee_id', ids).eq('source', 'employee_phl_claim').order('created_at', { ascending: false }).limit(250),
    ])
    const error = [staff, attendance, leaves, work, claims].find((result) => result.error)?.error
    if (error) throw error

    const nameById = new Map((staff.data || []).map((row) => [row.id, row.full_name || 'Karyawan']))
    const nameFor = (id: string) => nameById.get(id) || 'Karyawan'
    const workIds = (work.data || []).filter((row) => row.status === 'pending_supervisor').map((row) => row.id)
    const evidenceById = new Map<string, { id: string; fileName: string }[]>()
    if (workIds.length) {
      const evidence = await admin.from('phl_work_request_attachments')
        .select('id,request_id,file_name').in('request_id', workIds).order('slot_no')
      if (evidence.error) throw evidence.error
      for (const file of evidence.data || []) {
        const previous = evidenceById.get(file.request_id) || []
        previous.push({ id: file.id, fileName: file.file_name || 'Lampiran PHL' })
        evidenceById.set(file.request_id, previous)
      }
    }

    const items: DashboardApprovalItem[] = []
    for (const row of attendance.data || []) {
      if (!['submitted', 'pending'].includes(cleanStatus(row.employee_status)) ||
        ['approved', 'rejected'].includes(cleanStatus(row.supervisor_status))) continue
      // Period decisions include individual daily rows and require a detailed attendance review.
      // The dashboard must not blindly approve all days without opening the period breakdown.
      items.push({
        id: `attendance-${row.id}`, recordId: row.id, employeeId: row.employee_id,
        kind: 'attendance', name: nameFor(row.employee_id), category: 'Konfirmasi Absensi',
        date: row.period_month, status: 'Perlu verifikasi rincian',
        href: `/employee/approvals/${row.employee_id}/${row.period_month}`,
        description: 'Perlu pemeriksaan catatan harian, izin, PHL, dan koreksi sebelum persetujuan periode.',
        canApprove: false, canReject: false, requiresHr: false,
      })
    }
    for (const row of leaves.data || []) {
      if (deriveApprovalStage(row) !== 'waiting_supervisor') continue
      items.push({
        id: `leave-${row.id}`, recordId: row.id, employeeId: row.employee_id,
        kind: 'leave', name: nameFor(row.employee_id), category: row.leave_type || 'Cuti / Izin',
        date: row.start_date || '', status: 'Menunggu Atasan', href: '/employee/approvals/leave',
        description: row.reason || 'Tidak ada alasan tambahan.',
        extra: `${row.start_date || '-'}${row.end_date && row.end_date !== row.start_date ? ` s.d. ${row.end_date}` : ''} · ${Number(row.total_days || 0)} hari`,
        canApprove: true, canReject: true, requiresHr: false,
      })
    }
    for (const row of work.data || []) {
      if (cleanStatus(row.status) !== 'pending_supervisor') continue
      const expired = phlWorkApprovalExpired(row.work_date)
      const requiresHr = expired && row.origin === 'legacy_attendance'
      items.push({
        id: `work-${row.id}`, recordId: row.id, employeeId: row.employee_id,
        kind: 'work', name: nameFor(row.employee_id), category: 'Pengajuan Saldo PHL',
        date: row.work_date || '', status: requiresHr ? 'Migrasi lama · Perlu HR' : expired ? 'Lewat 90 hari · Tidak bisa disetujui' : 'Menunggu Atasan',
        href: '/employee/approvals/phl?status=pending', description: row.work_purpose || '-',
        extra: `${String(row.work_start_time || '').slice(0, 5)}–${String(row.work_end_time || '').slice(0, 5)} · ${Number(row.requested_work_minutes || 0)} menit`,
        canApprove: !expired, canReject: !requiresHr, requiresHr,
        attachments: evidenceById.get(row.id) || [],
      })
    }
    for (const row of claims.data || []) {
      if (deriveApprovalStage(row) !== 'waiting_supervisor') continue
      items.push({
        id: `claim-${row.id}`, recordId: row.id, employeeId: row.employee_id,
        kind: 'claim', name: nameFor(row.employee_id), category: 'Klaim PHL',
        date: row.phl_date || '', status: 'Menunggu Atasan', href: '/employee/approvals/leave',
        description: row.reason || 'Periksa rincian klaim PHL.', canApprove: true, canReject: true,
        requiresHr: false,
      })
    }
    const blockedTotal = items.filter((item) => item.requiresHr).length
    const active = items.filter((item) => !item.requiresHr)
    const blocked = items.filter((item) => item.requiresHr)
    return NextResponse.json({
      items: [...active, ...blocked].slice(0, 10), total: items.length,
      actionableTotal: active.filter((item) => item.canApprove || item.canReject).length,
      blockedTotal,
    }, { headers })
  } catch (error) {
    const status = Number((error as { status?: number }).status) || 500
    return NextResponse.json(
      { message: status < 500 ? (error as Error).message : 'Ringkasan approval tidak dapat dimuat.' },
      { status: status >= 400 && status < 600 ? status : 500, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'

import { apiError, requireHRApi } from '@/lib/server/hr-api-auth'
import {
  getWorkforceSchedulePolicy,
  isAllowedVendorJobFunction,
  normalizeJobFunction,
  type WorkforceType,
} from '@/lib/workforce'

type WorkforcePatchBody = {
  employee_id?: string
  workforce_type?: WorkforceType
  vendor_id?: string | null
  job_function?: string | null
}

const EMPLOYEE_SELECT = [
  'id',
  'employee_number',
  'machine_pin',
  'full_name',
  'email',
  'department',
  'position',
  'employment_status',
  'is_active',
  'workforce_type',
  'vendor_id',
  'job_function',
  'work_schedule_id',
  'work_schedule_name',
  'work_schedule_code',
  'schedule_group',
  'auto_detect_schedule',
  'updated_at',
].join(',')

const SCHEDULE_SELECT = [
  'id',
  'schedule_name',
  'schedule_code',
  'schedule_group',
  'schedule_type',
  'schedule_category',
  'expected_check_in',
  'expected_check_out',
  'shift_start',
  'shift_end',
  'crosses_midnight',
  'allow_double_shift',
  'late_tolerance_minutes',
  'is_default',
  'is_active',
].join(',')

export async function GET(request: NextRequest) {
  try {
    const { admin } = await requireHRApi(request)

    const [employeesResult, vendorsResult, schedulesResult] = await Promise.all([
      admin
        .from('employees')
        .select(EMPLOYEE_SELECT)
        .order('full_name', { ascending: true }),
      admin
        .from('outsource_vendors')
        .select('id,vendor_code,vendor_name,description,is_active,created_at,updated_at')
        .order('vendor_code', { ascending: true }),
      admin
        .from('work_schedules')
        .select(SCHEDULE_SELECT)
        .eq('is_active', true)
        .order('schedule_name', { ascending: true }),
    ])

    if (employeesResult.error) throw employeesResult.error
    if (vendorsResult.error) throw vendorsResult.error
    if (schedulesResult.error) throw schedulesResult.error

    const vendorMap = new Map(
      (vendorsResult.data || []).map((vendor: any) => [vendor.id, vendor]),
    )

    const scheduleMap = new Map(
      (schedulesResult.data || []).map((schedule: any) => [schedule.id, schedule]),
    )

    const employees = (employeesResult.data || []).map((employee: any) => ({
      ...employee,
      vendor: employee.vendor_id ? vendorMap.get(employee.vendor_id) || null : null,
      schedule: employee.work_schedule_id
        ? scheduleMap.get(employee.work_schedule_id) || null
        : null,
    }))

    return NextResponse.json({
      success: true,
      employees,
      vendors: vendorsResult.data || [],
      schedules: schedulesResult.data || [],
    })
  } catch (error) {
    const parsed = apiError(error, 'Gagal memuat master tenaga kerja.')
    return NextResponse.json(
      { success: false, error: parsed.message },
      { status: parsed.status },
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { admin, authEmail } = await requireHRApi(request)
    const body = (await request.json().catch(() => null)) as WorkforcePatchBody | null

    const employeeId = String(body?.employee_id || '').trim()
    const workforceType = String(body?.workforce_type || '').trim().toLowerCase() as WorkforceType

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: 'Employee ID wajib diisi.' },
        { status: 400 },
      )
    }

    if (!['organic', 'outsource'].includes(workforceType)) {
      return NextResponse.json(
        { success: false, error: 'Kategori tenaga kerja tidak valid.' },
        { status: 400 },
      )
    }

    const employeeResult = await admin
      .from('employees')
      .select('id,employee_number,full_name,is_active')
      .eq('id', employeeId)
      .maybeSingle()

    if (employeeResult.error) throw employeeResult.error
    if (!employeeResult.data) {
      return NextResponse.json(
        { success: false, error: 'Karyawan tidak ditemukan.' },
        { status: 404 },
      )
    }

    let vendorId: string | null = null
    let jobFunction: string | null = null
    let vendorCode = ''

    if (workforceType === 'outsource') {
      vendorId = String(body?.vendor_id || '').trim() || null
      jobFunction = normalizeJobFunction(body?.job_function) || null

      if (!vendorId) {
        return NextResponse.json(
          { success: false, error: 'Vendor wajib dipilih untuk karyawan outsource.' },
          { status: 400 },
        )
      }

      if (!jobFunction) {
        return NextResponse.json(
          { success: false, error: 'Fungsi kerja wajib dipilih untuk karyawan outsource.' },
          { status: 400 },
        )
      }

      const vendorResult = await admin
        .from('outsource_vendors')
        .select('id,vendor_code,vendor_name,is_active')
        .eq('id', vendorId)
        .maybeSingle()

      if (vendorResult.error) throw vendorResult.error
      if (!vendorResult.data || vendorResult.data.is_active === false) {
        return NextResponse.json(
          { success: false, error: 'Vendor outsource tidak aktif atau tidak ditemukan.' },
          { status: 400 },
        )
      }

      vendorCode = String(vendorResult.data.vendor_code || '').trim().toUpperCase()

      if (!isAllowedVendorJobFunction(vendorCode, jobFunction)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Fungsi kerja tidak sesuai dengan vendor yang dipilih.',
          },
          { status: 400 },
        )
      }
    }

    const policy = getWorkforceSchedulePolicy(workforceType, jobFunction)

    let scheduleId: string | null = null
    let scheduleCode = 'security_dynamic'
    let scheduleName = policy.scheduleName

    if (policy.mode === 'fixed' && policy.scheduleCode) {
      const scheduleResult = await admin
        .from('work_schedules')
        .select('id,schedule_code,schedule_name,schedule_group,is_active')
        .eq('schedule_code', policy.scheduleCode)
        .eq('is_active', true)
        .maybeSingle()

      if (scheduleResult.error) throw scheduleResult.error

      if (!scheduleResult.data) {
        return NextResponse.json(
          {
            success: false,
            error: `Jadwal ${policy.scheduleCode} belum aktif. Jalankan migration V8.2 Phase 1 terlebih dahulu.`,
          },
          { status: 409 },
        )
      }

      scheduleId = scheduleResult.data.id
      scheduleCode = scheduleResult.data.schedule_code
      scheduleName = scheduleResult.data.schedule_name
    }

    const updatePayload = {
      workforce_type: workforceType,
      vendor_id: workforceType === 'outsource' ? vendorId : null,
      job_function: workforceType === 'outsource' ? jobFunction : null,
      work_schedule_id: scheduleId,
      work_schedule_code: scheduleCode,
      work_schedule_name: scheduleName,
      schedule_group: policy.scheduleGroup,
      auto_detect_schedule: policy.autoDetectSchedule,
      updated_at: new Date().toISOString(),
    }

    const updatedResult = await admin
      .from('employees')
      .update(updatePayload)
      .eq('id', employeeId)
      .select(EMPLOYEE_SELECT)
      .single()

    if (updatedResult.error) throw updatedResult.error

    return NextResponse.json({
      success: true,
      employee: updatedResult.data,
      schedule_policy: {
        mode: policy.mode,
        schedule_code: scheduleCode,
        schedule_name: scheduleName,
        schedule_group: policy.scheduleGroup,
        auto_detect_schedule: policy.autoDetectSchedule,
      },
      audit: {
        actor: authEmail,
        changed_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    const parsed = apiError(error, 'Gagal menyimpan klasifikasi tenaga kerja.')
    return NextResponse.json(
      { success: false, error: parsed.message },
      { status: parsed.status },
    )
  }
}

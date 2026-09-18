export type WorkforceType = 'organic' | 'outsource'

export type WorkforceSchedulePolicy = {
  mode: 'fixed' | 'security_dynamic'
  scheduleCode: string | null
  scheduleGroup: string
  autoDetectSchedule: boolean
  scheduleName: string
}

export type OutsourceJobFunctionCode =
  | 'landscaping'
  | 'driver'
  | 'cleaning_service'
  | 'electrician'
  | 'it'
  | 'security'

export const WORKFORCE_TYPE_LABELS: Record<WorkforceType, string> = {
  organic: 'Karyawan Organik',
  outsource: 'Karyawan Outsource',
}

export const OUTSOURCE_JOB_FUNCTIONS: Array<{
  code: OutsourceJobFunctionCode
  label: string
  vendorCodes: string[]
}> = [
  { code: 'landscaping', label: 'LS / Landscaping', vendorCodes: ['ABR'] },
  { code: 'driver', label: 'Driver', vendorCodes: ['ABR'] },
  { code: 'cleaning_service', label: 'CS / Cleaning Service', vendorCodes: ['PCN'] },
  { code: 'electrician', label: 'Electrician', vendorCodes: ['PCN'] },
  { code: 'it', label: 'IT', vendorCodes: ['PCN'] },
  { code: 'security', label: 'Security', vendorCodes: ['PCN'] },
]

export const JOB_FUNCTION_LABELS = OUTSOURCE_JOB_FUNCTIONS.reduce<Record<string, string>>(
  (acc, item) => {
    acc[item.code] = item.label
    return acc
  },
  {},
)

export function normalizeVendorCode(value: unknown) {
  return String(value || '').trim().toUpperCase()
}

export function normalizeJobFunction(value: unknown): OutsourceJobFunctionCode | '' {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\/]+/g, ' ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  const aliases: Record<string, OutsourceJobFunctionCode> = {
    landscaping: 'landscaping',
    ls: 'landscaping',
    ls_landscaping: 'landscaping',
    driver: 'driver',
    cleaning_service: 'cleaning_service',
    cleaning: 'cleaning_service',
    cs: 'cleaning_service',
    cs_cleaning_service: 'cleaning_service',
    electrician: 'electrician',
    elektrisi: 'electrician',
    it: 'it',
    information_technology: 'it',
    security: 'security',
    satpam: 'security',
  }

  return aliases[normalized] || ''
}

export function getAvailableJobFunctions(vendorCode: unknown) {
  const code = normalizeVendorCode(vendorCode)
  return OUTSOURCE_JOB_FUNCTIONS.filter((item) => item.vendorCodes.includes(code))
}

export function isAllowedVendorJobFunction(vendorCode: unknown, jobFunction: unknown) {
  const code = normalizeVendorCode(vendorCode)
  const job = normalizeJobFunction(jobFunction)
  if (!code || !job) return false

  const option = OUTSOURCE_JOB_FUNCTIONS.find((item) => item.code === job)
  return Boolean(option?.vendorCodes.includes(code))
}

export function isSecurityJobFunction(jobFunction: unknown) {
  return normalizeJobFunction(jobFunction) === 'security'
}

export function getWorkforceSchedulePolicy(
  workforceType: WorkforceType,
  jobFunction: unknown,
): WorkforceSchedulePolicy {
  if (workforceType === 'organic') {
    return {
      mode: 'fixed',
      scheduleCode: 'regular_poltek',
      scheduleGroup: 'regular',
      autoDetectSchedule: false,
      scheduleName: 'Jam Kerja Reguler Poltek',
    }
  }

  const job = normalizeJobFunction(jobFunction)

  if (job === 'security') {
    return {
      mode: 'security_dynamic',
      scheduleCode: null,
      scheduleGroup: 'security',
      autoDetectSchedule: true,
      scheduleName: 'Security Dynamic Shift',
    }
  }

  if (job === 'landscaping' || job === 'cleaning_service') {
    return {
      mode: 'fixed',
      scheduleCode: 'labour_supply_0700_1600',
      scheduleGroup: 'labour_supply',
      autoDetectSchedule: false,
      scheduleName: 'Jam Kerja Outsource 07:00 - 16:00',
    }
  }

  return {
    mode: 'fixed',
    scheduleCode: 'regular_poltek',
    scheduleGroup: 'regular',
    autoDetectSchedule: false,
    scheduleName: 'Jam Kerja Reguler Poltek',
  }
}

export function getJobFunctionLabel(value: unknown) {
  const code = normalizeJobFunction(value)
  return code ? JOB_FUNCTION_LABELS[code] || String(value || '-') : '-'
}

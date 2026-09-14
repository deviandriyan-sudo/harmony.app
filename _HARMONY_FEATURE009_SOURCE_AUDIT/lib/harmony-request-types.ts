import { supabase } from '@/lib/supabase'

export type HarmonyRequestTypeDefinition = {
  code: string
  label: string
  group_label: string
  request_category: string
  attendance_status: string
  correction_type: string | null
  description: string | null
  requires_proof: boolean
  requires_manual_time: boolean
  is_leave_like: boolean
  is_absence_like: boolean
  is_phl_claim: boolean
  show_in_attendance: boolean
  show_in_leave: boolean
  is_system: boolean
  is_active: boolean
  sort_order: number
}

export const FALLBACK_HARMONY_REQUEST_TYPES: HarmonyRequestTypeDefinition[] = [
  typeRow(
    'present',
    'Hadir Normal',
    'Kehadiran',
    'attendance',
    'present',
    'attendance_confirmation',
    false,
    false,
    false,
    false,
    false,
    true,
    false,
    10,
    'Konfirmasi kehadiran normal.',
  ),

  typeRow(
    'manual_attendance',
    'Hadir Manual / Koreksi Jam',
    'Kehadiran',
    'attendance',
    'present',
    'manual_check',
    true,
    true,
    false,
    false,
    false,
    true,
    false,
    20,
    'Kehadiran manual ketika fingerprint tidak tersedia atau tidak lengkap.',
  ),

  typeRow(
    'annual_leave',
    'Cuti Tahunan',
    'Cuti',
    'leave',
    'leave',
    'annual_leave',
    false,
    false,
    true,
    true,
    false,
    true,
    true,
    30,
    'Cuti tahunan yang menggunakan saldo cuti aktif.',
  ),

  typeRow(
    'marriage_leave',
    'Cuti Menikah',
    'Cuti',
    'leave',
    'leave',
    'marriage_leave',
    true,
    false,
    true,
    true,
    false,
    true,
    true,
    40,
  ),

  typeRow(
    'maternity_leave',
    'Cuti Melahirkan',
    'Cuti',
    'leave',
    'leave',
    'maternity_leave',
    true,
    false,
    true,
    true,
    false,
    true,
    true,
    50,
  ),

  typeRow(
    'miscarriage_leave',
    'Cuti Keguguran',
    'Cuti',
    'leave',
    'leave',
    'miscarriage_leave',
    true,
    false,
    true,
    true,
    false,
    true,
    true,
    60,
  ),

  typeRow(
    'bereavement_leave',
    'Cuti Duka',
    'Cuti',
    'leave',
    'leave',
    'bereavement_leave',
    true,
    false,
    true,
    true,
    false,
    true,
    true,
    70,
  ),

  typeRow(
    'child_circumcision_leave',
    'Cuti Khitan / Baptis Anak',
    'Cuti',
    'leave',
    'leave',
    'child_circumcision_leave',
    true,
    false,
    true,
    true,
    false,
    true,
    true,
    80,
  ),

  typeRow(
    'worship_leave',
    'Cuti Ibadah',
    'Cuti',
    'leave',
    'leave',
    'worship_leave',
    true,
    false,
    true,
    true,
    false,
    true,
    true,
    90,
  ),

  typeRow(
    'menstrual_leave',
    'Cuti Haid',
    'Cuti',
    'leave',
    'leave',
    'menstrual_leave',
    false,
    false,
    true,
    true,
    false,
    true,
    true,
    100,
  ),

  typeRow(
    'pregnancy_check_leave',
    'Pemeriksaan Kehamilan',
    'Cuti',
    'leave',
    'leave',
    'pregnancy_check_leave',
    true,
    false,
    true,
    true,
    false,
    true,
    true,
    110,
  ),

  typeRow(
    'sick',
    'Sakit',
    'Keterangan Lain',
    'sick',
    'sick',
    'sick',
    true,
    false,
    false,
    true,
    false,
    true,
    true,
    120,
  ),

  typeRow(
    'permit',
    'Izin',
    'Keterangan Lain',
    'permit',
    'permit',
    'permit',
    false,
    false,
    false,
    true,
    false,
    true,
    true,
    130,
  ),

  typeRow(
    'official_travel',
    'Tugas Luar / Dinas',
    'Keterangan Lain',
    'official_travel',
    'official_travel',
    'official_travel',
    true,
    false,
    false,
    true,
    false,
    true,
    true,
    140,
  ),

  typeRow(
    'phl_claim',
    'Klaim PHL',
    'PHL',
    'phl_claim',
    'phl_claim',
    'phl_claim',
    false,
    false,
    false,
    true,
    true,
    true,
    true,
    150,
    'Penggunaan saldo PHL aktif.',
  ),

  typeRow(
    'other_leave',
    'Cuti Lainnya',
    'Cuti',
    'leave',
    'leave',
    'other_leave',
    true,
    false,
    true,
    true,
    false,
    true,
    true,
    160,
  ),

  typeRow(
    'absent',
    'Alpa / Tidak Hadir',
    'Keterangan Lain',
    'absence',
    'absent',
    'absent',
    false,
    false,
    false,
    true,
    false,
    true,
    false,
    170,
  ),
]

let cachedTypes: HarmonyRequestTypeDefinition[] = [
  ...FALLBACK_HARMONY_REQUEST_TYPES,
]

function typeRow(
  code: string,
  label: string,
  groupLabel: string,
  requestCategory: string,
  attendanceStatus: string,
  correctionType: string,
  requiresProof: boolean,
  requiresManualTime: boolean,
  isLeaveLike: boolean,
  isAbsenceLike: boolean,
  isPhlClaim: boolean,
  showInAttendance: boolean,
  showInLeave: boolean,
  sortOrder: number,
  description = '',
): HarmonyRequestTypeDefinition {
  return {
    code,
    label,
    group_label: groupLabel,
    request_category: requestCategory,
    attendance_status: attendanceStatus,
    correction_type: correctionType,
    description,
    requires_proof: requiresProof,
    requires_manual_time: requiresManualTime,
    is_leave_like: isLeaveLike,
    is_absence_like: isAbsenceLike,
    is_phl_claim: isPhlClaim,
    show_in_attendance: showInAttendance,
    show_in_leave: showInLeave,
    is_system: true,
    is_active: true,
    sort_order: sortOrder,
  }
}

export function setHarmonyRequestTypeCache(
  types: HarmonyRequestTypeDefinition[],
) {
  if (!Array.isArray(types) || types.length === 0) {
    cachedTypes = [...FALLBACK_HARMONY_REQUEST_TYPES]
    return
  }

  const merged = new Map<string, HarmonyRequestTypeDefinition>()

  FALLBACK_HARMONY_REQUEST_TYPES.forEach((item) => {
    merged.set(item.code, item)
  })

  types.forEach((item) => {
    if (item?.code) {
      merged.set(item.code, normalizeType(item))
    }
  })

  cachedTypes = Array.from(merged.values()).sort(
    (a, b) =>
      Number(a.sort_order || 0) - Number(b.sort_order || 0) ||
      a.label.localeCompare(b.label, 'id'),
  )
}

export function getHarmonyRequestTypesCache() {
  return [...cachedTypes]
}

export function getHarmonyRequestTypeMeta(
  code: string | null | undefined,
) {
  const key = String(code || '').trim()

  const found = cachedTypes.find((item) => item.code === key)

  if (found) {
    return found
  }

  return {
    code: key || 'other',
    label: key ? humanizeCode(key) : 'Keterangan Lain',
    group_label: 'Keterangan Lain',
    request_category: 'other',
    attendance_status: key || 'absent',
    correction_type: key || 'other',
    description:
      'Jenis historis/custom. Metadata fallback digunakan agar data lama tetap terbaca.',
    requires_proof: false,
    requires_manual_time: false,
    is_leave_like: false,
    is_absence_like: true,
    is_phl_claim: false,
    show_in_attendance: true,
    show_in_leave: true,
    is_system: false,
    is_active: false,
    sort_order: 9999,
  } satisfies HarmonyRequestTypeDefinition
}

export function getActiveHarmonyTypesForScope(
  types: HarmonyRequestTypeDefinition[],
  scope: 'attendance' | 'leave',
) {
  return types
    .filter((item) => item.is_active !== false)
    .filter((item) =>
      scope === 'attendance'
        ? item.show_in_attendance
        : item.show_in_leave,
    )
    .sort(
      (a, b) =>
        Number(a.sort_order || 0) - Number(b.sort_order || 0) ||
        a.label.localeCompare(b.label, 'id'),
    )
}

export function groupHarmonyTypes(
  types: HarmonyRequestTypeDefinition[],
) {
  const groups = new Map<
    string,
    HarmonyRequestTypeDefinition[]
  >()

  types.forEach((item) => {
    const group = item.group_label || 'Keterangan Lain'

    const current = groups.get(group) || []

    current.push(item)

    groups.set(group, current)
  })

  return Array.from(groups.entries())
}

export async function refreshHarmonyRequestTypes() {
  try {
    const { data: sessionData } =
      await supabase.auth.getSession()

    const token =
      sessionData.session?.access_token

    if (!token) {
      setHarmonyRequestTypeCache(
        FALLBACK_HARMONY_REQUEST_TYPES,
      )

      return getHarmonyRequestTypesCache()
    }

    const response = await fetch('/api/leave/types', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    })

    const result =
      await response.json().catch(() => null)

    if (
      !response.ok ||
      !Array.isArray(result?.types)
    ) {
      setHarmonyRequestTypeCache(
        FALLBACK_HARMONY_REQUEST_TYPES,
      )

      return getHarmonyRequestTypesCache()
    }

    setHarmonyRequestTypeCache(result.types)

    return getHarmonyRequestTypesCache()
  } catch {
    setHarmonyRequestTypeCache(
      FALLBACK_HARMONY_REQUEST_TYPES,
    )

    return getHarmonyRequestTypesCache()
  }
}

function normalizeType(
  item: HarmonyRequestTypeDefinition,
): HarmonyRequestTypeDefinition {
  return {
    code: String(item.code || '').trim(),

    label: String(
      item.label ||
        item.code ||
        'Keterangan',
    ).trim(),

    group_label: String(
      item.group_label ||
        'Keterangan Lain',
    ).trim(),

    request_category: String(
      item.request_category ||
        'other',
    ).trim(),

    attendance_status: String(
      item.attendance_status ||
        item.code ||
        'absent',
    ).trim(),

    correction_type:
      item.correction_type
        ? String(item.correction_type)
        : null,

    description:
      item.description
        ? String(item.description)
        : null,

    requires_proof:
      Boolean(item.requires_proof),

    requires_manual_time:
      Boolean(item.requires_manual_time),

    is_leave_like:
      Boolean(item.is_leave_like),

    is_absence_like:
      Boolean(item.is_absence_like),

    is_phl_claim:
      Boolean(item.is_phl_claim),

    show_in_attendance:
      item.show_in_attendance !== false,

    show_in_leave:
      item.show_in_leave !== false,

    is_system:
      Boolean(item.is_system),

    is_active:
      item.is_active !== false,

    sort_order:
      Number(item.sort_order || 100),
  }
}

function humanizeCode(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1),
    )
    .join(' ')
}
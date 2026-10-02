import type { SupabaseClient } from '@supabase/supabase-js'
import { REMED_SIGNATURE_BUCKET } from '@/lib/remed'

export type RemedSignatureProfileRow = {
  employee_id: string
  signer_role: 'hr' | 'finance' | null
  signature_path: string | null
  signature_origin: 'seed' | 'upload' | null
  signature_file_name: string | null
  signature_mime_type: string | null
  updated_at: string | null
}

export type RemedSignatureDisplay = {
  employee_id: string | null
  employee_number: string | null
  full_name: string
  department: string | null
  position: string | null
  role: 'employee' | 'hr' | 'finance'
  signature_url: string | null
  signature_source: 'upload' | 'seed' | 'none'
  updated_at: string | null
}

async function createSignatureUrl(admin: SupabaseClient, profile: RemedSignatureProfileRow | null) {
  if (!profile?.signature_path) return { url: null as string | null, source: 'none' as const }

  const { data, error } = await admin.storage
    .from(REMED_SIGNATURE_BUCKET)
    .createSignedUrl(profile.signature_path, 10 * 60)

  if (!error && data?.signedUrl) {
    return {
      url: data.signedUrl,
      source: profile.signature_origin === 'seed' ? ('seed' as const) : ('upload' as const),
    }
  }

  return { url: null as string | null, source: 'none' as const }
}

export async function getRemedSignatureDisplay(
  admin: SupabaseClient,
  employeeId: string,
  role: 'employee' | 'hr' | 'finance' = 'employee',
): Promise<RemedSignatureDisplay | null> {
  const [{ data: employee, error: employeeError }, { data: profile, error: profileError }] = await Promise.all([
    admin
      .from('employees')
      .select('id,employee_number,full_name,department,position')
      .eq('id', employeeId)
      .maybeSingle(),
    admin
      .from('remed_signature_profiles')
      .select('employee_id,signer_role,signature_path,signature_origin,signature_file_name,signature_mime_type,updated_at')
      .eq('employee_id', employeeId)
      .maybeSingle(),
  ])

  if (employeeError) throw employeeError
  if (profileError) throw profileError
  if (!employee) return null

  const resolved = await createSignatureUrl(admin, (profile || null) as RemedSignatureProfileRow | null)

  return {
    employee_id: employee.id,
    employee_number: employee.employee_number,
    full_name: employee.full_name || 'Karyawan',
    department: employee.department,
    position: employee.position,
    role,
    signature_url: resolved.url,
    signature_source: resolved.source,
    updated_at: profile?.updated_at || null,
  }
}

export async function getRemedRoleSignatory(
  admin: SupabaseClient,
  role: 'hr' | 'finance',
  snapshotEmployeeId?: string | null,
): Promise<RemedSignatureDisplay | null> {
  let employeeId = snapshotEmployeeId || null

  if (!employeeId) {
    const { data, error } = await admin
      .from('remed_signature_profiles')
      .select('employee_id')
      .eq('signer_role', role)
      .maybeSingle()
    if (error) throw error
    employeeId = data?.employee_id || null
  }

  if (!employeeId) return null
  return getRemedSignatureDisplay(admin, employeeId, role)
}

export async function getRemedPrintSignatures(
  admin: SupabaseClient,
  input: {
    employeeId: string
    hrSignatoryEmployeeId?: string | null
    financeSignatoryEmployeeId?: string | null
  },
) {
  const [employee, hr, finance] = await Promise.all([
    getRemedSignatureDisplay(admin, input.employeeId, 'employee'),
    getRemedRoleSignatory(admin, 'hr', input.hrSignatoryEmployeeId),
    getRemedRoleSignatory(admin, 'finance', input.financeSignatoryEmployeeId),
  ])

  return { employee, hr, finance }
}

export async function getRemedSignatureManagement(admin: SupabaseClient) {
  const [{ data: employees, error: employeeError }, { data: profiles, error: profileError }] = await Promise.all([
    admin
      .from('employees')
      .select('id,employee_number,full_name,department,position,email,is_active')
      .eq('is_active', true)
      .order('full_name', { ascending: true }),
    admin
      .from('remed_signature_profiles')
      .select('employee_id,signer_role,signature_path,signature_origin,signature_file_name,signature_mime_type,updated_at'),
  ])

  if (employeeError) throw employeeError
  if (profileError) throw profileError

  const profileMap = new Map<string, RemedSignatureProfileRow>()
  for (const row of (profiles || []) as RemedSignatureProfileRow[]) profileMap.set(row.employee_id, row)

  const rows = await Promise.all(
    (employees || []).map(async (employee: any) => {
      const profile = profileMap.get(employee.id) || null
      const resolved = await createSignatureUrl(admin, profile)
      return {
        ...employee,
        signer_role: profile?.signer_role || null,
        signature_url: resolved.url,
        signature_source: resolved.source,
        signature_file_name: profile?.signature_file_name || null,
        updated_at: profile?.updated_at || null,
      }
    }),
  )

  return rows
}

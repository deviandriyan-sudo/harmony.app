import type { SupabaseClient } from '@supabase/supabase-js'

export async function enrichRemedClaims(admin: SupabaseClient, claims: any[]) {
  if (!claims.length) return []

  const employeeIds = [...new Set(claims.map((x) => x.employee_id).filter(Boolean))]
  const typeIds = [...new Set(claims.map((x) => x.claim_type_id).filter(Boolean))]
  const claimIds = claims.map((x) => x.id)

  const [employeesResult, typesResult, attachmentsResult] = await Promise.all([
    employeeIds.length
      ? admin.from('employees').select('id,employee_number,full_name,department,position,email').in('id', employeeIds)
      : Promise.resolve({ data: [], error: null }),
    typeIds.length
      ? admin.from('remed_claim_types').select('id,code,name,description,is_active').in('id', typeIds)
      : Promise.resolve({ data: [], error: null }),
    claimIds.length
      ? admin.from('remed_claim_attachments').select('id,claim_id,file_name,mime_type,file_size,attachment_kind,created_at').in('claim_id', claimIds).order('created_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ])

  const employeeMap = new Map((employeesResult.data || []).map((x: any) => [x.id, x]))
  const typeMap = new Map((typesResult.data || []).map((x: any) => [x.id, x]))
  const attachmentMap = new Map<string, any[]>()

  for (const attachment of attachmentsResult.data || []) {
    const list = attachmentMap.get(attachment.claim_id) || []
    list.push(attachment)
    attachmentMap.set(attachment.claim_id, list)
  }

  return claims.map((claim) => ({
    ...claim,
    employee: employeeMap.get(claim.employee_id) || null,
    claim_type: typeMap.get(claim.claim_type_id) || null,
    attachments: attachmentMap.get(claim.id) || [],
  }))
}

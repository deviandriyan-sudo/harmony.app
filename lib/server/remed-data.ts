import type { SupabaseClient } from '@supabase/supabase-js'

function entitlementKey(employeeId: string, year: number) {
  return `${employeeId}:${year}`
}

export async function enrichRemedClaims(admin: SupabaseClient, claims: any[]) {
  if (!claims.length) return []

  const employeeIds = [...new Set(claims.map((x) => x.employee_id).filter(Boolean))]
  const typeIds = [...new Set(claims.map((x) => x.claim_type_id).filter(Boolean))]
  const claimIds = claims.map((x) => x.id)
  const periodYears = [
    ...new Set(
      claims
        .map((x) => Number(String(x.treatment_date || '').slice(0, 4)))
        .filter((year) => Number.isInteger(year) && year > 2000),
    ),
  ]

  const [employeesResult, typesResult, attachmentsResult, entitlementsResult] = await Promise.all([
    employeeIds.length
      ? admin.from('employees').select('id,employee_number,full_name,department,position,email').in('id', employeeIds)
      : Promise.resolve({ data: [], error: null }),
    typeIds.length
      ? admin.from('remed_claim_types').select('id,code,name,description,is_active').in('id', typeIds)
      : Promise.resolve({ data: [], error: null }),
    claimIds.length
      ? admin.from('remed_claim_attachments').select('id,claim_id,file_name,mime_type,file_size,attachment_kind,created_at').in('claim_id', claimIds).order('created_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    employeeIds.length && periodYears.length
      ? admin
          .from('remed_entitlements')
          .select('id,employee_id,period_year,plafond_total,legacy_used,current_used,reserved_amount,balance_adjustment')
          .in('employee_id', employeeIds)
          .in('period_year', periodYears)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (employeesResult.error) throw employeesResult.error
  if (typesResult.error) throw typesResult.error
  if (attachmentsResult.error) throw attachmentsResult.error
  if (entitlementsResult.error) throw entitlementsResult.error

  const employeeMap = new Map((employeesResult.data || []).map((x: any) => [x.id, x]))
  const typeMap = new Map((typesResult.data || []).map((x: any) => [x.id, x]))
  const attachmentMap = new Map<string, any[]>()
  const entitlementMap = new Map<string, any>()

  for (const attachment of attachmentsResult.data || []) {
    const list = attachmentMap.get(attachment.claim_id) || []
    list.push(attachment)
    attachmentMap.set(attachment.claim_id, list)
  }

  for (const entitlement of entitlementsResult.data || []) {
    const plafondTotal = Number(entitlement.plafond_total || 0)
    const balanceAdjustment = Number(entitlement.balance_adjustment || 0)
    const legacyUsed = Number(entitlement.legacy_used || 0)
    const currentUsed = Number(entitlement.current_used || 0)
    const reservedAmount = Number(entitlement.reserved_amount || 0)

    entitlementMap.set(entitlementKey(entitlement.employee_id, Number(entitlement.period_year)), {
      ...entitlement,
      plafond_total: plafondTotal,
      balance_adjustment: balanceAdjustment,
      legacy_used: legacyUsed,
      current_used: currentUsed,
      reserved_amount: reservedAmount,
      available_amount: plafondTotal + balanceAdjustment - legacyUsed - currentUsed - reservedAmount,
    })
  }

  return claims.map((claim) => {
    const periodYear = Number(String(claim.treatment_date || '').slice(0, 4))
    return {
      ...claim,
      employee: employeeMap.get(claim.employee_id) || null,
      claim_type: typeMap.get(claim.claim_type_id) || null,
      attachments: attachmentMap.get(claim.id) || [],
      entitlement: entitlementMap.get(entitlementKey(claim.employee_id, periodYear)) || null,
    }
  })
}

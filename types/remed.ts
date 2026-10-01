export type RemedRole = 'employee' | 'hr' | 'finance'

export type RemedClaimStatus =
  | 'pending_hr'
  | 'rejected_hr'
  | 'pending_finance'
  | 'rejected_finance'
  | 'waiting_payment'
  | 'paid'
  | 'cancelled'
  | 'legacy_record'

export type RemedSession = {
  accessId: string
  role: RemedRole
  email: string
  authUserId: string
  employeeId: string | null
  userName: string
  isActive: boolean
}

export type RemedClaimType = {
  id: string
  code: string
  name: string
  description?: string | null
  is_active: boolean
}

export type RemedEntitlement = {
  id: string
  employee_id: string
  period_year: number
  plafond_total: number
  legacy_used: number
  current_used: number
  reserved_amount: number
  available_amount: number
  employee?: {
    id: string
    full_name: string | null
    employee_number: string | null
    department: string | null
    position: string | null
    email: string | null
  } | null
}

export type RemedClaimAttachment = {
  id: string
  claim_id: string
  file_name: string
  mime_type: string | null
  file_size: number | null
  attachment_kind: 'receipt' | 'payment_proof'
  created_at: string
}

export type RemedClaim = {
  id: string
  claim_number: string
  employee_id: string
  claim_type_id: string
  treatment_date: string
  provider_name: string | null
  submitted_amount: number
  approved_amount: number | null
  employee_note: string | null
  status: RemedClaimStatus
  hr_note: string | null
  finance_note: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_account_name: string | null
  payment_date: string | null
  payment_reference: string | null
  affects_entitlement: boolean
  legacy_status: string | null
  legacy_receipt_url: string | null
  legacy_payment_proof_url: string | null
  created_at: string
  updated_at: string
  employee?: {
    id: string
    full_name: string | null
    employee_number: string | null
    department: string | null
    position: string | null
    email: string | null
  } | null
  claim_type?: RemedClaimType | null
  attachments?: RemedClaimAttachment[]
}

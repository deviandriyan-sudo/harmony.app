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
  bankName: string | null
  bankAccountNumber: string | null
  bankAccountName: string | null
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
  balance_adjustment: number
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
  hr_reviewed_by: string | null
  hr_reviewed_at: string | null
  hr_signatory_employee_id: string | null
  finance_note: string | null
  finance_reviewed_by: string | null
  finance_reviewed_at: string | null
  finance_signatory_employee_id: string | null
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
  entitlement?: RemedEntitlement | null
}

export type RemedProcessHistory = {
  event_id: string
  claim_id: string
  claim_number: string
  employee_id: string | null
  employee_name: string | null
  claim_type_name: string | null
  treatment_date: string | null
  submitted_amount: number | null
  approved_amount: number | null
  from_status: string | null
  to_status: string
  current_status: string
  actor_role: string | null
  actor_email: string | null
  note: string | null
  event_at: string
  is_deleted: boolean
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

export type RemedSignatureManagementRow = {
  id: string
  employee_number: string | null
  full_name: string | null
  department: string | null
  position: string | null
  email: string | null
  is_active: boolean | null
  signer_role: 'hr' | 'finance' | null
  signature_url: string | null
  signature_source: 'upload' | 'seed' | 'none'
  signature_file_name: string | null
  updated_at: string | null
}

export type RemedPrintSignatures = {
  employee: RemedSignatureDisplay | null
  hr: RemedSignatureDisplay | null
  finance: RemedSignatureDisplay | null
}

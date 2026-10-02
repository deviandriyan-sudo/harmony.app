# HARMONY DATABASE COMPACT V2 — SOURCE AUDIT

Baseline source: `HARMONY_REMED_V1_2_0_SINGLE_LOGIN_FULL_REPLACEMENT`.

## Direct PHL table usage in application source

- `phl_records` — 8 source files. Canonical PHL request/claim data. **KEEP**.
- `phl_hr_adjustments` — 3 source files. HR manual adjustment/evidence. Candidate to merge into a future ledger only after RPC/data audit.
- Other `phl_*` tables are not directly referenced by TypeScript/TSX source, but may be used inside PostgreSQL RPC/functions. **Do not delete/move before live function audit.**

## PHL RPCs called by application

- `get_my_phl_balance_summary`
- `harmony_employee_cancel_phl_claim_v1`
- `harmony_employee_submit_phl_claim_v1`
- `harmony_supervisor_get_phl_claims_v1`
- `harmony_supervisor_review_phl_claim_v1`
- `harmony_sync_phl_balance_from_attendance_v2`
- `hr_adjust_employee_phl_balance_with_evidence_v1`
- `hr_approve_phl_claim_atomic`
- `hr_cancel_approved_phl_claim_atomic`
- `hr_get_employee_phl_balance_detail_v2`
- `hr_get_legacy_phl_claims`
- `hr_get_phl_reconciliation`
- `hr_mark_legacy_phl_claim_reviewed`
- `hr_record_phl_employee_review`
- `hr_reject_phl_claim_atomic`

## Direct Re-Med table usage in application source

- `remed_user_access` — authorization. **KEEP**.
- `remed_entitlements` — plafond/balance. **KEEP**.
- `remed_claims` — canonical claim. **KEEP**.
- `remed_claim_types` — configurable types. **KEEP**.
- `remed_claim_attachments` — documents. Candidate rename/merge to `remed_documents`.
- `remed_audit_logs` — event/audit. Candidate merge to `remed_events`.

Indirect Re-Med tables used by database functions:

- `remed_status_logs` — candidate merge to `remed_events`.
- `remed_payment_logs` — candidate merge to `remed_events`.
- `remed_claim_sequences` — candidate replace with native PostgreSQL sequence.
- `remed_legacy_imports` — candidate move to `archive` schema.

## Re-Med RPCs called by application

- `remed_submit_claim_v1`
- `remed_cancel_claim_v1`
- `remed_hr_review_claim_v1`
- `remed_finance_review_claim_v1`
- `remed_mark_claim_paid_v1`
- `remed_set_entitlement_v1`

## Safety gate

No compact migration should be executed until the live PRECHECK output is reviewed. The PRECHECK collects:

- all `phl_*` / `remed_*` tables
- columns and defaults
- PK/FK/UNIQUE/CHECK constraints
- indexes
- RLS state and policies
- triggers
- dependent views
- live PostgreSQL function definitions that reference PHL/Re-Med

This is necessary because several PHL tables are likely indirect dependencies of RPCs even though the frontend does not query them directly.

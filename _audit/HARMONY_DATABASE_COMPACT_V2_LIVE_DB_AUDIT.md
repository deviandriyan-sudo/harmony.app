# HARMONY DATABASE COMPACT V2 — LIVE DATABASE AUDIT

Source: Supabase PRECHECK export received 2026-10-01.

## Live inventory

- 25 relevant tables inspected (PHL, Re-Med, and shared core tables).
- 61 relevant PostgreSQL functions inspected.
- 10 `phl_*` tables currently in `public`.
- 10 `remed_*` tables currently in `public`.

## Direct application dependencies

PHL:
- `public.phl_records` — used directly by 8 app source files. KEEP in `public`.
- `public.phl_hr_adjustments` — used directly by 3 app source files. KEEP in `public`.
- Other PHL technical/audit tables are not queried directly by TypeScript/TSX, but several are referenced by RPC/functions.

Re-Med:
- `remed_user_access`, `remed_entitlements`, `remed_claim_types`, `remed_claims`, and `remed_claim_attachments` are runtime business tables and remain in `public`.
- Audit/status/payment/counter/legacy tables are indirect/internal data and are moved to dedicated schemas.

## Compact target

### public

PHL business tables:
- `phl_records`
- `phl_hr_adjustments`

Re-Med business tables:
- `remed_user_access`
- `remed_entitlements`
- `remed_claim_types`
- `remed_claims`
- `remed_claim_attachments`

### harmony_internal

- `phl_claim_allocations`
- `phl_claim_usages`
- `phl_employee_legacy_balances`
- `phl_hr_adjustment_allocations`
- `remed_claim_sequences`

### harmony_audit

- `phl_attendance_credit_audit_logs`
- `phl_claim_audit_logs`
- `phl_reconciliation_audit_logs`
- `remed_audit_logs`
- `remed_status_logs`
- `remed_payment_logs`

### harmony_archive

- `phl_balances` — empty and had no dependent function/view in PRECHECK.
- `remed_legacy_imports` — historical import snapshots; no runtime function dependency.

## Preservation

Migration uses `ALTER TABLE ... SET SCHEMA`; it does not copy-and-delete rows. Relation OIDs, indexes, constraints, FKs, triggers, policies, and table ACLs remain attached to the same table objects.

23 live functions that referenced moved tables are recreated from the exact PRECHECK definitions with only the affected relation schema names changed.

`public.remed_audit_logs` is retained as a compatibility VIEW during transition so the currently deployed V1.2 server source does not fail between database migration and source deployment.

## Row snapshot from PRECHECK

PHL:
- `phl_records`: ~98
- `phl_hr_adjustments`: ~13
- `phl_claim_allocations`: ~5
- `phl_claim_usages`: ~5
- `phl_employee_legacy_balances`: ~45
- `phl_attendance_credit_audit_logs`: ~27
- `phl_claim_audit_logs`: ~5
- remaining moved PHL technical tables: ~0

Re-Med:
- `remed_user_access`: ~47
- `remed_entitlements`: ~37
- `remed_claim_types`: ~8
- `remed_claims`: ~1
- `remed_legacy_imports`: ~77
- attachment/audit/status/payment/counter tables: ~0 at PRECHECK time

## RLS note

Compact V2 does NOT change the existing RLS state of canonical HARMONY tables. `phl_records` remains as-is because enabling RLS without a separate policy migration could break existing employee/supervisor/HR flows. This release is schema organization only.

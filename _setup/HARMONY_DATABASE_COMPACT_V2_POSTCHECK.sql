-- HARMONY DATABASE COMPACT V2 - POSTCHECK
-- READ ONLY. Run only after HARMONY_DATABASE_COMPACT_V2_MIGRATION.sql succeeds.
-- Export the single result grid to CSV and upload it for verification.

with checks as (
  select 1 as sort_order, '01_public_phl_table_count'::text as check_name,
         count(*)::text as result
  from pg_tables
  where schemaname='public' and tablename like 'phl\_%' escape '\'

  union all
  select 2, '02_public_remed_table_count', count(*)::text
  from pg_tables
  where schemaname='public' and tablename like 'remed\_%' escape '\'

  union all
  select 3, '03_public_phl_tables', coalesce(string_agg(tablename, ', ' order by tablename), '-')
  from pg_tables
  where schemaname='public' and tablename like 'phl\_%' escape '\'

  union all
  select 4, '04_public_remed_tables', coalesce(string_agg(tablename, ', ' order by tablename), '-')
  from pg_tables
  where schemaname='public' and tablename like 'remed\_%' escape '\'

  union all
  select 5, '05_internal_tables', coalesce(string_agg(tablename, ', ' order by tablename), '-')
  from pg_tables
  where schemaname='harmony_internal'

  union all
  select 6, '06_audit_tables', coalesce(string_agg(tablename, ', ' order by tablename), '-')
  from pg_tables
  where schemaname='harmony_audit'

  union all
  select 7, '07_archive_tables', coalesce(string_agg(tablename, ', ' order by tablename), '-')
  from pg_tables
  where schemaname='harmony_archive'

  union all
  select 8, '08_moved_tables_still_in_public', count(*)::text
  from pg_tables
  where schemaname='public'
    and tablename in (
      'phl_attendance_credit_audit_logs',
      'phl_claim_allocations',
      'phl_claim_audit_logs',
      'phl_claim_usages',
      'phl_employee_legacy_balances',
      'phl_hr_adjustment_allocations',
      'phl_reconciliation_audit_logs',
      'phl_balances',
      'remed_audit_logs',
      'remed_claim_sequences',
      'remed_legacy_imports',
      'remed_payment_logs',
      'remed_status_logs'
    )

  union all
  select 9, '09_compat_remed_audit_view', count(*)::text
  from information_schema.views
  where table_schema='public' and table_name='remed_audit_logs'

  union all
  select 10, '10_stale_function_public_refs', count(*)::text
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and (
      pg_get_functiondef(p.oid) like '%public.phl_attendance_credit_audit_logs%'
      or pg_get_functiondef(p.oid) like '%public.phl_claim_allocations%'
      or pg_get_functiondef(p.oid) like '%public.phl_claim_audit_logs%'
      or pg_get_functiondef(p.oid) like '%public.phl_employee_legacy_balances%'
      or pg_get_functiondef(p.oid) like '%public.phl_hr_adjustment_allocations%'
      or pg_get_functiondef(p.oid) like '%public.phl_reconciliation_audit_logs%'
      or pg_get_functiondef(p.oid) like '%public.remed_claim_sequences%'
      or pg_get_functiondef(p.oid) like '%public.remed_payment_logs%'
      or pg_get_functiondef(p.oid) like '%public.remed_status_logs%'
    )

  union all
  select 11, '11_phl_records', count(*)::text from public.phl_records
  union all
  select 12, '12_phl_hr_adjustments', count(*)::text from public.phl_hr_adjustments
  union all
  select 13, '13_phl_claim_allocations_internal', count(*)::text from harmony_internal.phl_claim_allocations
  union all
  select 14, '14_phl_claim_usages_internal', count(*)::text from harmony_internal.phl_claim_usages
  union all
  select 15, '15_phl_employee_legacy_balances_internal', count(*)::text from harmony_internal.phl_employee_legacy_balances
  union all
  select 16, '16_phl_hr_adjustment_allocations_internal', count(*)::text from harmony_internal.phl_hr_adjustment_allocations
  union all
  select 17, '17_phl_attendance_credit_audit', count(*)::text from harmony_audit.phl_attendance_credit_audit_logs
  union all
  select 18, '18_phl_claim_audit', count(*)::text from harmony_audit.phl_claim_audit_logs
  union all
  select 19, '19_phl_reconciliation_audit', count(*)::text from harmony_audit.phl_reconciliation_audit_logs

  union all
  select 20, '20_remed_access', count(*)::text from public.remed_user_access
  union all
  select 21, '21_remed_entitlements', count(*)::text from public.remed_entitlements
  union all
  select 22, '22_remed_claim_types', count(*)::text from public.remed_claim_types
  union all
  select 23, '23_remed_claims', count(*)::text from public.remed_claims
  union all
  select 24, '24_remed_claim_attachments', count(*)::text from public.remed_claim_attachments
  union all
  select 25, '25_remed_claim_sequences_internal', count(*)::text from harmony_internal.remed_claim_sequences
  union all
  select 26, '26_remed_audit_logs', count(*)::text from harmony_audit.remed_audit_logs
  union all
  select 27, '27_remed_status_logs', count(*)::text from harmony_audit.remed_status_logs
  union all
  select 28, '28_remed_payment_logs', count(*)::text from harmony_audit.remed_payment_logs
  union all
  select 29, '29_remed_legacy_imports_archive', count(*)::text from harmony_archive.remed_legacy_imports

  union all
  select 30, '30_remed_write_audit_rpc', count(*)::text
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='remed_write_audit_v1'

  union all
  select 31, '31_private_remed_bucket', count(*)::text
  from storage.buckets where id='remed-private' and public=false
)
select check_name, result
from checks
order by sort_order;

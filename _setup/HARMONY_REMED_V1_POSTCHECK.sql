-- HARMONY + RE-MED V1.1 POSTCHECK
-- Run only after HARMONY_REMED_V1_MIGRATION.sql succeeds.
select '01_remed_tables' as section, count(*)::text as result
from information_schema.tables where table_schema='public' and table_name like 'remed_%'
union all
select '02_claim_types', count(*)::text from public.remed_claim_types where is_active
union all
select '03_access_total', count(*)::text from public.remed_user_access
union all
select '04_access_employee', count(*)::text from public.remed_user_access where role='employee' and is_active
union all
select '05_access_hr', count(*)::text from public.remed_user_access where role='hr' and is_active
union all
select '06_access_finance', count(*)::text from public.remed_user_access where role='finance' and is_active
union all
select '07_2026_entitlements', count(*)::text from public.remed_entitlements where period_year=2026
union all
select '08_legacy_plafond_total', coalesce(sum(plafond_total),0)::text from public.remed_entitlements where period_year=2026 and note like 'Opening historical balance%'
union all
select '09_legacy_used_total', coalesce(sum(legacy_used),0)::text from public.remed_entitlements where period_year=2026 and note like 'Opening historical balance%'
union all
select '10_legacy_claims', count(*)::text from public.remed_claims where status='legacy_record'
union all
select '11_legacy_import_rows', count(*)::text from public.remed_legacy_imports
union all
select '12_legacy_users_snapshot', count(*)::text from public.remed_legacy_imports where source_table='Users_rows'
union all
select '13_legacy_employees_snapshot', count(*)::text from public.remed_legacy_imports where source_table='employees_rows'
union all
select '14_legacy_reimbursements_snapshot', count(*)::text from public.remed_legacy_imports where source_table='reimbursements_rows'
union all
select '15_unmapped_legacy_employee_snapshot', count(*)::text from public.remed_legacy_imports where source_table='employees_rows' and employee_id is null
union all
select '16_private_bucket', count(*)::text from storage.buckets where id='remed-private' and public=false
union all
select '17_rls_enabled', count(*)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'remed_%' and c.relrowsecurity;

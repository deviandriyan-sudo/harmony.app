-- HARMONY Stage 7: DIAGNOSIS ONLY. Each SELECT independent. No DDL / DML.
-- No rows with employee names/emails are returned. Execute using Supabase SQL Editor.
-- 1. Discover lifecycle tables/views actually installed; do not assume source SQL is production schema.
SELECT n.nspname AS schema_name,c.relname AS object_name,
       CASE c.relkind WHEN 'r' THEN 'table' WHEN 'v' THEN 'view'
         WHEN 'm' THEN 'materialized_view' WHEN 'p' THEN 'partitioned_table'
         ELSE c.relkind::text END AS object_type
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname IN ('public','cron')
  AND (c.relname ILIKE '%leave%' OR c.relname ILIKE '%postpone%'
       OR c.relname ILIKE '%phl%' OR c.relname ILIKE '%harmony_system_controls%')
ORDER BY schema_name,object_name;

-- 2. Discover installed RPC implementations and privilege mode, without leaking function bodies.
SELECT n.nspname AS schema_name,p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS signature,
       p.prosecdef AS security_definer,
       p.provolatile AS volatility
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND (p.proname ILIKE '%leave%' OR p.proname ILIKE '%postpone%'
       OR p.proname ILIKE '%phl%' OR p.proname ILIKE '%reconcil%'
       OR p.proname ILIKE '%matur%')
ORDER BY function_name,signature;

-- 3. Discover triggers relevant to leave/postpone/PHL; not limited to one guessed table name.
SELECT n.nspname AS schema_name, c.relname AS table_name,
       t.tgname AS trigger_name, pg_get_triggerdef(t.oid,true) AS trigger_definition
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND NOT t.tgisinternal
  AND (c.relname ILIKE '%leave%' OR c.relname ILIKE '%postpone%'
       OR c.relname ILIKE '%phl%' OR c.relname='employees')
ORDER BY table_name,trigger_name;

-- 4. Discover actual date/eligibility fields before specifying any accrual rules.
SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default
FROM information_schema.columns
WHERE table_schema='public'
  AND (table_name='employees' OR table_name ILIKE '%leave%' OR table_name ILIKE '%postpone%')
  AND (column_name ILIKE '%date%' OR column_name ILIKE '%matur%'
       OR column_name ILIKE '%expir%' OR column_name ILIKE '%cycle%'
       OR column_name ILIKE '%join%' OR column_name ILIKE '%day%')
ORDER BY table_name,ordinal_position;

-- 5. Current lifecycle summary consistency (aggregate only; no employee PII).
SELECT count(*) AS employee_summaries,
       count(*) FILTER (WHERE annual_regular_days IS NULL OR postpone_active_days IS NULL
         OR annual_manual_adjustment_days IS NULL OR annual_total_available_days IS NULL)
         AS incomplete_summaries,
       count(*) FILTER (WHERE abs(
         greatest(0,coalesce(annual_regular_days,0)+coalesce(postpone_active_days,0)
          +coalesce(annual_manual_adjustment_days,0))
          - coalesce(annual_total_available_days,0))>0.001) AS arithmetic_mismatches
FROM public.harmony_leave_balance_summary;

-- 6. Scheduler presence only (no assumptions that pg_cron or Supabase scheduled jobs exist).
SELECT to_regclass('cron.job') IS NOT NULL AS pg_cron_job_table_present,
       EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') AS pg_cron_extension_installed,
       current_setting('TimeZone') AS database_session_timezone,
       now() AS database_time;
-- OPTIONAL, run separately ONLY if Query 6 reports cron.job exists:
-- SELECT jobid,jobname,schedule,active,command FROM cron.job ORDER BY jobid;
-- Inspect command for secrets/URLs before sharing; redact any tokens.

-- 7. RLS status/policies; this does not prove real user permission behavior.
SELECT schemaname,tablename,policyname,cmd,roles,qual,with_check
FROM pg_policies WHERE schemaname='public'
  AND (tablename ILIKE '%leave%' OR tablename ILIKE '%postpone%' OR tablename ILIKE '%phl%')
ORDER BY tablename,policyname;

-- 8. Reminder: full SQL definitions for maturity/expiry RPCs are required
-- before writing a new idempotent crediting worker. Do not create cron jobs
-- or backfill production balances based on assumed employment tenure.

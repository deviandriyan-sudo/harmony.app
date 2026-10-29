-- HARMONY Stage 8 | READ ONLY | snapshot-based production validation.
-- Run SELECT blocks separately in Supabase SQL Editor. No writes, no PII output.
-- Source snapshot from database.zip generated 2026-10-29T01:39:59Z.
-- NEVER execute an UPDATE or enable a trigger based solely on CSV exports.

-- [1] RPC execution grants: SECURITY DEFINER is dangerous if EXECUTE is public.
SELECT p.proname AS rpc,
       pg_get_function_identity_arguments(p.oid) AS signature,
       p.prosecdef AS security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN (
  'harmony_reconcile_leave_lifecycle_one',
  'harmony_reconcile_leave_lifecycle',
  'harmony_ensure_annual_leave_cycles',
  'harmony_hr_correct_annual_leave_balance_v1',
  'harmony_review_phl_work_request_v1'
)
ORDER BY rpc, signature;

-- [2] Cron installation and scheduler metadata availability.
SELECT extname, extversion, extnamespace::regnamespace::text AS schema_name
FROM pg_extension WHERE extname IN ('pg_cron','pg_net');
SELECT to_regclass('cron.job') IS NOT NULL AS pg_cron_job_exists,
       to_regclass('cron.job_run_details') IS NOT NULL AS run_history_exists;
-- If cron.job exists, inspect jobs in Supabase UI using an administrator account.
-- Do NOT post secrets, URLs with tokens, or raw job commands in chat.

-- [3] Known public Storage policies. Returns policy rules only, no file contents.
SELECT polname AS policy_name, polcmd AS command, polroles::text AS roles,
       pg_get_expr(polqual,polrelid) AS using_expression,
       pg_get_expr(polwithcheck,polrelid) AS check_expression
FROM pg_policy
WHERE polrelid='storage.objects'::regclass
ORDER BY policy_name;

-- [4] Public Storage buckets (privacy review before migration).
SELECT id AS bucket_name, public AS is_public,
       file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('attendance-uploads','leave-attachments','phl-proofs');

-- [5] Active employee counts & existing cycles, no names, email or identifiers.
SELECT
 (SELECT count(*) FROM public.employees WHERE coalesce(is_active,true)) AS active_employees,
 (SELECT count(*) FROM public.annual_leave_cycles) AS cycles,
 (SELECT count(*) FROM public.annual_leave_employee_adjustments) AS adjustment_rows,
 (SELECT count(*) FROM public.leave_lifecycle_audit_logs) AS lifecycle_events;

-- [6] Audit job-run effects after activating Stage 8. No employee identifiers.
SELECT date(created_at AT TIME ZONE 'Asia/Makassar') AS date_wita,
       event_type, count(*) AS event_count
FROM public.leave_lifecycle_audit_logs
WHERE created_at >= now()-interval '14 days'
GROUP BY 1,2 ORDER BY 1 DESC,2;

-- [7] Disabled PHL triggers: informational only. Do not enable without review.
SELECT c.relname AS table_name, t.tgname AS trigger_name,
       t.tgenabled AS enabled_flag
FROM pg_trigger t
JOIN pg_class c ON c.oid=t.tgrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND t.tgname IN
 ('trg_harmony_attendance_phl_credit','trg_harmony_period_phl_credit');

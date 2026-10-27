-- ONLY when correction fails with "database tidak menghubungkan".
-- Read-only diagnostics: save output and share with developer; no employee PII needed.
SELECT pg_get_viewdef('public.harmony_leave_balance_summary'::regclass, true)
AS view_definition;
SELECT n.nspname AS schema_name, p.oid::regprocedure::text AS signature,
       pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN ('hr_get_leave_administration_context',
                   'harmony_get_my_leave_postpone_context',
                   'harmony_leave_is_active_hr_admin')
ORDER BY p.proname;

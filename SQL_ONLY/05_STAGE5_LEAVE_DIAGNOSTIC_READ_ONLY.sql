-- HARMONY Stage 5: READ-ONLY diagnostics for HR annual-leave correction.
-- No INSERT, UPDATE, DELETE, ALTER, DROP, or CREATE operations.
-- Run in Supabase SQL Editor, review output privately (contains no raw employee rows).

SELECT 'correction_audit_table' AS test,
       (to_regclass('public.harmony_annual_leave_correction_audit') IS NOT NULL) AS present
UNION ALL
SELECT 'correction_rpc',
       (to_regprocedure('public.harmony_hr_correct_annual_leave_balance_v1(uuid,numeric,text)') IS NOT NULL)
UNION ALL
SELECT 'hr_permission_rpc',
       (to_regprocedure('public.harmony_leave_is_active_hr_admin()') IS NOT NULL)
UNION ALL
SELECT 'balance_summary_view',
       (to_regclass('public.harmony_leave_balance_summary') IS NOT NULL);

-- The following view definition is necessary to verify whether manual
-- legacy balance is included in annual_manual_adjustment_days.
-- It does NOT return employee names, emails, or individual balances.
SELECT pg_get_viewdef('public.harmony_leave_balance_summary'::regclass, true)
AS lifecycle_view_definition;

-- Database function may be present but calculate balances differently.
-- Only schema/function metadata is returned, not employee records.
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS signature,
       p.prosecdef AS security_definer,
       p.proacl AS access_control_list
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('harmony_leave_is_active_hr_admin',
                    'harmony_hr_correct_annual_leave_balance_v1')
ORDER BY p.proname;

-- Check that all summary columns exist; no employee data exported.
SELECT c.column_name, c.data_type
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'harmony_leave_balance_summary'
  AND c.column_name IN (
   'employee_id', 'annual_regular_days', 'postpone_active_days',
   'annual_manual_adjustment_days', 'annual_total_available_days'
  ) ORDER BY c.column_name;

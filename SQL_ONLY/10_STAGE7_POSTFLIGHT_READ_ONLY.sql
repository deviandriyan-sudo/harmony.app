-- HARMONY Stage 7 verification (READ ONLY). No Stage 7 DB migration is required.
SELECT to_regprocedure('public.harmony_hr_correct_annual_leave_balance_v1(uuid,numeric,text)') IS NOT NULL
 AS stage6_annual_correction_rpc_exists,
 to_regclass('public.harmony_leave_balance_summary') IS NOT NULL AS summary_view_exists,
 to_regclass('public.annual_leave_employee_adjustments') IS NOT NULL AS canonical_adjustments_exist,
 to_regclass('public.harmony_system_controls') IS NOT NULL AS maintenance_control_exists,
 to_regprocedure('public.harmony_claim_jobs_v1(text,integer)') IS NOT NULL
 AS example_queue_claim_signature_exists;
-- If last signature is false, inspect actual function signature using SQL 09 Query 2
-- and the existing email worker health screen; no claim that the worker is active.
SELECT count(*) AS adjustment_rows,
       count(*) FILTER (WHERE adjustment_days IS NULL) AS null_adjustments
FROM public.annual_leave_employee_adjustments;

-- Read-only verification (do not insert anything).
SELECT to_regclass('public.harmony_annual_leave_correction_audit') AS correction_audit_table,
  to_regprocedure('public.harmony_hr_correct_annual_leave_balance_v1(uuid,numeric,text)') AS safe_correction_rpc;
SELECT employee_id, previous_effective_balance, corrected_effective_balance,
       previous_adjustment, corrected_adjustment, created_at
FROM public.harmony_annual_leave_correction_audit
ORDER BY created_at DESC LIMIT 20;
-- To verify a specific employee, compare employees and lifecycle summary:
-- SELECT e.id, e.full_name, e.annual_leave_balance, s.annual_regular_days,
-- s.postpone_active_days, s.annual_manual_adjustment_days, s.annual_total_available_days
-- FROM public.employees e JOIN public.harmony_leave_balance_summary s ON s.employee_id=e.id
-- WHERE e.id='<employee uuid>'::uuid;

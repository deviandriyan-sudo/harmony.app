-- Stage 6 verification. READ ONLY; run AFTER installing 07 and performing
-- a legitimate correction using the HR UI with an authorized HR session.
-- Does not return names, emails, employee IDs, reasons, or individual balances.
SELECT to_regprocedure('public.harmony_hr_correct_annual_leave_balance_v1(uuid,numeric,text)') IS NOT NULL
  AS rpc_exists,
  (SELECT count(*) FROM public.annual_leave_employee_adjustments) AS adjustment_rows,
  (SELECT count(*) FROM public.harmony_annual_leave_correction_audit) AS audit_entries,
  (SELECT max(created_at) FROM public.harmony_annual_leave_correction_audit) AS last_correction_at;

-- Database writer vs view calculation consistency (aggregate only; no PII).
SELECT count(*) AS mismatched_adjustment_rows
FROM public.harmony_leave_balance_summary s
LEFT JOIN public.annual_leave_employee_adjustments a ON a.employee_id=s.employee_id
WHERE abs(s.annual_manual_adjustment_days-COALESCE(a.adjustment_days,0))>0.001;

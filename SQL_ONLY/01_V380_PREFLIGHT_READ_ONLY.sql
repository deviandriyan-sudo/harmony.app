-- HARMONY V3.8.0 / read only. Jalankan SEBELUM migrasi.
-- Pastikan empat pemeriksaan di bawah menghasilkan baris valid.
SELECT 'employees.annual_leave_balance' AS check_item,
       data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='employees' AND column_name='annual_leave_balance';

SELECT 'harmony_leave_balance_summary' AS check_item,
       c.column_name, c.data_type
FROM information_schema.columns c
WHERE c.table_schema='public' AND c.table_name='harmony_leave_balance_summary'
  AND c.column_name IN ('employee_id','annual_regular_days','postpone_active_days','annual_manual_adjustment_days','annual_total_available_days')
ORDER BY c.column_name;

SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='harmony_leave_is_active_hr_admin';

SELECT employee_id, annual_regular_days, postpone_active_days,
       annual_manual_adjustment_days, annual_total_available_days
FROM public.harmony_leave_balance_summary
WHERE annual_manual_adjustment_days <> 0
LIMIT 10;

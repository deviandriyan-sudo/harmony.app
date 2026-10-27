-- HARMONY V3.8.0 — guarded correction of existing lifecycle adjustment.
-- Does NOT replace any existing view, trigger, RPC, or approval function.
-- Requires confirmed preflight: annual_manual_adjustment_days must respond
-- to changes in employees.annual_leave_balance. Otherwise EVERY correction
-- aborts and rolls back, retaining original balance and history.
BEGIN;

CREATE TABLE IF NOT EXISTS public.harmony_annual_leave_correction_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  actor_uid uuid NOT NULL,
  actor_email text,
  previous_legacy_balance numeric NOT NULL,
  corrected_legacy_balance numeric NOT NULL,
  previous_effective_balance numeric NOT NULL,
  corrected_effective_balance numeric NOT NULL,
  previous_adjustment numeric NOT NULL,
  corrected_adjustment numeric NOT NULL,
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 12 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS harmony_leave_correction_audit_employee_idx
ON public.harmony_annual_leave_correction_audit (employee_id,created_at DESC);

ALTER TABLE public.harmony_annual_leave_correction_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.harmony_annual_leave_correction_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.harmony_annual_leave_correction_audit TO authenticated;
DROP POLICY IF EXISTS harmony_annual_correction_hr_read ON public.harmony_annual_leave_correction_audit;
CREATE POLICY harmony_annual_correction_hr_read
ON public.harmony_annual_leave_correction_audit FOR SELECT TO authenticated
USING (public.harmony_leave_is_active_hr_admin());

CREATE OR REPLACE FUNCTION public.harmony_hr_correct_annual_leave_balance_v1(
  p_employee_id uuid, p_target_days numeric, p_reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
 v_employee public.employees%ROWTYPE;
 v_before public.harmony_leave_balance_summary%ROWTYPE;
 v_after public.harmony_leave_balance_summary%ROWTYPE;
 v_target numeric;
 v_delta numeric;
 v_new_legacy numeric;
 v_old_adj numeric;
 v_expected_adj numeric;
 v_audit_id uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.harmony_leave_is_active_hr_admin() THEN
  RAISE EXCEPTION 'Hanya HR/Admin aktif dapat melakukan koreksi saldo cuti.' USING ERRCODE='42501';
 END IF;
 IF p_employee_id IS NULL OR p_target_days IS NULL OR p_target_days < 0
    OR p_target_days > 365 OR p_target_days <> trunc(p_target_days) THEN
  RAISE EXCEPTION 'Target saldo harus bilangan bulat 0 sampai 365 hari.';
 END IF;
 IF length(btrim(coalesce(p_reason,''))) < 12 OR length(p_reason) > 1000 THEN
  RAISE EXCEPTION 'Alasan koreksi minimal 12 karakter dan maksimal 1000.';
 END IF;
 -- One employee row lock serializes concurrent HR edits on that employee.
 SELECT * INTO v_employee FROM public.employees
 WHERE id=p_employee_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Karyawan tidak ditemukan.'; END IF;
 IF v_employee.is_active IS FALSE THEN
  RAISE EXCEPTION 'Koreksi saldo hanya untuk karyawan aktif.';
 END IF;
 SELECT * INTO v_before FROM public.harmony_leave_balance_summary
 WHERE employee_id=p_employee_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Ringkasan lifecycle karyawan belum tersedia; koreksi dibatalkan.'; END IF;
 IF v_before.annual_regular_days IS NULL OR v_before.postpone_active_days IS NULL
 OR v_before.annual_manual_adjustment_days IS NULL OR v_before.annual_total_available_days IS NULL THEN
  RAISE EXCEPTION 'Komponen lifecycle belum lengkap; koreksi dibatalkan.';
 END IF;
 v_target := p_target_days;
 IF v_before.annual_total_available_days = v_target THEN
  RETURN jsonb_build_object('success',true,'unchanged',true,'balance',v_target);
 END IF;
 v_old_adj := v_before.annual_manual_adjustment_days;
 v_expected_adj := v_target - v_before.annual_regular_days - v_before.postpone_active_days;
 v_delta := v_expected_adj - v_old_adj;
 v_new_legacy := coalesce(v_employee.annual_leave_balance, 0) + v_delta;
 -- Update only legacy adjustment source; never touch leave cycles or postpone.
 UPDATE public.employees SET annual_leave_balance=v_new_legacy
 WHERE id=p_employee_id;
 SELECT * INTO v_after FROM public.harmony_leave_balance_summary
 WHERE employee_id=p_employee_id;
 -- Mandatory check: fail closed if database's real calculation is different.
 -- A raised exception rolls back BOTH the update and the audit event.
 IF v_after.employee_id IS NULL OR
    abs(coalesce(v_after.annual_manual_adjustment_days, -999999)-v_expected_adj) > 0.001 OR
    abs(coalesce(v_after.annual_total_available_days, -999999)-v_target) > 0.001 OR
    abs(coalesce(v_after.annual_regular_days, -999999)-v_before.annual_regular_days) > 0.001 OR
    abs(coalesce(v_after.postpone_active_days, -999999)-v_before.postpone_active_days) > 0.001 THEN
  RAISE EXCEPTION 'Database tidak menghubungkan saldo legacy ke adjustment lifecycle secara sesuai. Perubahan dibatalkan otomatis. Kirim hasil SQL preflight untuk penyesuaian aman.';
 END IF;
 INSERT INTO public.harmony_annual_leave_correction_audit
 (employee_id,actor_uid,actor_email,previous_legacy_balance,corrected_legacy_balance,
  previous_effective_balance,corrected_effective_balance,previous_adjustment,corrected_adjustment,reason)
 VALUES (p_employee_id,auth.uid(),coalesce(auth.jwt()->>'email',''),
  coalesce(v_employee.annual_leave_balance,0),v_new_legacy,
  v_before.annual_total_available_days,v_after.annual_total_available_days,
  v_old_adj,v_expected_adj,btrim(p_reason)) RETURNING id INTO v_audit_id;
 RETURN jsonb_build_object('success',true,'audit_id',v_audit_id,
 'previous_balance',v_before.annual_total_available_days,'corrected_balance',v_after.annual_total_available_days,
 'previous_adjustment',v_old_adj,'corrected_adjustment',v_expected_adj);
END;
$$;
REVOKE ALL ON FUNCTION public.harmony_hr_correct_annual_leave_balance_v1(uuid,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.harmony_hr_correct_annual_leave_balance_v1(uuid,numeric,text) TO authenticated;
COMMIT;

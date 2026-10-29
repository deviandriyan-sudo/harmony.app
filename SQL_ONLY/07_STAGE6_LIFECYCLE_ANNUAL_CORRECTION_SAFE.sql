-- HARMONY Stage 6 | SAFE lifecycle correction, matched to production schema 2026-10-29.
-- Run ONCE in Supabase SQL Editor, after confirming a database backup.
-- Purpose: replace ONLY RPC implementation; no bulk employee UPDATE/DELETE;
-- no changes to cycles, postpone, leave requests, PHL, or existing adjustment rows.
-- Function is transactional: failures rollback the adjustment and audit insert.
-- SECURITY: authenticated HR/Admin only. SQL Editor role must own the existing function.
-- IMPORTANT: Do NOT re-run SQL_ONLY/02_V380_SAFE_AUDITED_ANNUAL_CORRECTION.sql afterward.
BEGIN;

DO $preflight$
DECLARE missing text;
BEGIN
 IF to_regclass('public.employees') IS NULL OR
    to_regclass('public.annual_leave_employee_adjustments') IS NULL OR
    to_regclass('public.harmony_leave_balance_summary') IS NULL OR
    to_regclass('public.harmony_annual_leave_correction_audit') IS NULL THEN
   RAISE EXCEPTION 'Stage 6 preflight: required lifecycle tables/view/audit table missing; nothing changed.';
 END IF;
 IF to_regprocedure('public.harmony_hr_correct_annual_leave_balance_v1(uuid,numeric,text)') IS NULL OR
    to_regprocedure('public.harmony_leave_is_active_hr_admin()') IS NULL THEN
   RAISE EXCEPTION 'Stage 6 preflight: correction or HR permission RPC missing; nothing changed.';
 END IF;
 -- Production evidence: eight adjustment columns, employee_id UUID PK, 48 existing rows.
 IF NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.conrelid = 'public.annual_leave_employee_adjustments'::regclass
   AND c.contype='p' AND pg_get_constraintdef(c.oid) = 'PRIMARY KEY (employee_id)'
 ) THEN
   RAISE EXCEPTION 'Stage 6 preflight: adjustment employee_id primary key changed; abort.';
 END IF;
 SELECT string_agg(field_name, ', ') INTO missing
 FROM (VALUES ('employee_id'),('adjustment_days'),('updated_at'),('note'),
              ('last_system_balance'),('last_manual_delta'),('last_manual_detected_at')) cols(field_name)
 WHERE NOT EXISTS (
   SELECT 1 FROM information_schema.columns c
   WHERE c.table_schema='public' AND c.table_name='annual_leave_employee_adjustments'
      AND c.column_name=cols.field_name
 );
 IF missing IS NOT NULL THEN
   RAISE EXCEPTION 'Stage 6 preflight: adjustment table columns missing: %',missing;
 END IF;
 -- The current view must depend on lifecycle adjustment table, not legacy balance.
 IF position('annual_leave_employee_adjustments' in
   pg_get_viewdef('public.harmony_leave_balance_summary'::regclass, true)) = 0 THEN
   RAISE EXCEPTION 'Stage 6 preflight: lifecycle summary view changed; abort.';
 END IF;
END
$preflight$;

CREATE OR REPLACE FUNCTION public.harmony_hr_correct_annual_leave_balance_v1(
  p_employee_id uuid, p_target_days numeric, p_reason text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_employee public.employees%ROWTYPE;
  v_before public.harmony_leave_balance_summary%ROWTYPE;
  v_after public.harmony_leave_balance_summary%ROWTYPE;
  v_old_adj numeric;
  v_current_adj numeric;
  v_expected_adj numeric;
  v_delta numeric;
  v_audit_id uuid;
BEGIN
  -- Keep the existing auth and input contracts, including audit reason length.
  IF auth.uid() IS NULL OR NOT public.harmony_leave_is_active_hr_admin() THEN
    RAISE EXCEPTION 'Hanya HR/Admin aktif dapat melakukan koreksi saldo cuti.' USING ERRCODE='42501';
  END IF;
  IF p_employee_id IS NULL OR p_target_days IS NULL OR p_target_days < 0
     OR p_target_days > 365 OR p_target_days <> trunc(p_target_days) THEN
    RAISE EXCEPTION 'Target saldo harus bilangan bulat 0 sampai 365 hari.';
  END IF;
  IF length(btrim(coalesce(p_reason, ''))) < 12 OR length(p_reason) > 1000 THEN
    RAISE EXCEPTION 'Alasan koreksi minimal 12 karakter dan maksimal 1000.';
  END IF;
  -- Serialize corrections for one employee, preserving all other employee rows.
  SELECT * INTO v_employee FROM public.employees
    WHERE id=p_employee_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Karyawan tidak ditemukan.'; END IF;
  IF v_employee.is_active IS FALSE THEN
    RAISE EXCEPTION 'Koreksi saldo hanya untuk karyawan aktif.';
  END IF;

  SELECT * INTO v_before FROM public.harmony_leave_balance_summary
    WHERE employee_id=p_employee_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ringkasan lifecycle karyawan belum tersedia; koreksi dibatalkan.';
  END IF;
  IF v_before.annual_regular_days IS NULL OR v_before.postpone_active_days IS NULL
     OR v_before.annual_manual_adjustment_days IS NULL OR
     v_before.annual_total_available_days IS NULL THEN
    RAISE EXCEPTION 'Komponen lifecycle belum lengkap; koreksi dibatalkan.';
  END IF;
  IF v_before.annual_total_available_days=p_target_days THEN
    RETURN jsonb_build_object('success',true,'unchanged',true,'balance',p_target_days);
  END IF;

  -- View source: max(0, annual_regular + postpone_active + adjustment_days).
  v_old_adj := v_before.annual_manual_adjustment_days;
  v_expected_adj := p_target_days - v_before.annual_regular_days - v_before.postpone_active_days;
  v_delta := v_expected_adj - v_old_adj;
  -- Existing adjustment row may be absent (default 0). Lock it when present.
  SELECT adjustment_days INTO v_current_adj
  FROM public.annual_leave_employee_adjustments
  WHERE employee_id=p_employee_id FOR UPDATE;
  IF NOT FOUND THEN v_current_adj := 0; END IF;
  IF abs(coalesce(v_current_adj, -999999)-v_old_adj)>0.001 THEN
    RAISE EXCEPTION 'Adjustment lifecycle berubah sejak ringkasan dibaca; koreksi dibatalkan.';
  END IF;

  -- Make ONE atomic upsert to the canonical adjustment source. Preserve the
  -- existing note/checkpoint/manual-delta metadata on CONFLICT. Do not update
  -- employees.annual_leave_balance: that legacy column is not used by this
  -- view; changing both could be detected again by external reconciliations.
  INSERT INTO public.annual_leave_employee_adjustments
    (employee_id,adjustment_days,note)
  VALUES (p_employee_id,v_expected_adj,'Koreksi saldo HR; detail alasan tersedia di audit HARMONY')
  ON CONFLICT (employee_id) DO UPDATE
    SET adjustment_days=EXCLUDED.adjustment_days,
        updated_at=now();

  SELECT * INTO v_after FROM public.harmony_leave_balance_summary
    WHERE employee_id=p_employee_id;
  IF v_after.employee_id IS NULL OR
     abs(coalesce(v_after.annual_manual_adjustment_days,-999999)-v_expected_adj)>0.001 OR
     abs(coalesce(v_after.annual_total_available_days,-999999)-p_target_days)>0.001 OR
     abs(coalesce(v_after.annual_regular_days,-999999)-v_before.annual_regular_days)>0.001 OR
     abs(coalesce(v_after.postpone_active_days,-999999)-v_before.postpone_active_days)>0.001 THEN
    RAISE EXCEPTION 'Verifikasi saldo lifecycle gagal; transaksi dibatalkan tanpa perubahan.';
  END IF;

  INSERT INTO public.harmony_annual_leave_correction_audit
    (employee_id,actor_uid,actor_email,previous_legacy_balance,corrected_legacy_balance,
     previous_effective_balance,corrected_effective_balance,previous_adjustment,corrected_adjustment,reason)
  VALUES (p_employee_id,auth.uid(),coalesce(auth.jwt()->>'email',''),
    coalesce(v_employee.annual_leave_balance,0),coalesce(v_employee.annual_leave_balance,0),
    v_before.annual_total_available_days,v_after.annual_total_available_days,
    v_old_adj,v_expected_adj,btrim(p_reason)) RETURNING id INTO v_audit_id;

  RETURN jsonb_build_object('success',true,'audit_id',v_audit_id,
    'previous_balance',v_before.annual_total_available_days,
    'corrected_balance',v_after.annual_total_available_days,
    'previous_adjustment',v_old_adj,'corrected_adjustment',v_expected_adj,
    'adjustment_delta',v_delta,'legacy_balance_unchanged',true);
END;
$function$;

-- Restrict function invocation even though the function itself rechecks HR.
REVOKE ALL ON FUNCTION public.harmony_hr_correct_annual_leave_balance_v1(uuid,numeric,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.harmony_hr_correct_annual_leave_balance_v1(uuid,numeric,text)
  TO authenticated;
COMMIT;

-- Read-only postflight (no individual employee PII):
SELECT to_regprocedure('public.harmony_hr_correct_annual_leave_balance_v1(uuid,numeric,text)') IS NOT NULL
  AS stage6_correction_rpc_installed,
  (SELECT count(*) FROM public.annual_leave_employee_adjustments) AS adjustment_rows_after_migration;
-- The count should still be 48 unless someone independently changed production data.
-- Do not test the RPC from the SQL Editor: HR auth.uid() must come from a real login.

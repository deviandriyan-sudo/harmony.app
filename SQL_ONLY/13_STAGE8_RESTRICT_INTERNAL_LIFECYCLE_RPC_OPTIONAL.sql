-- OPTIONAL SECURITY MIGRATION, NOT AN AUTOMATIC INSTALL STEP.
-- Requires the READ ONLY grants results from 12_STAGE8 and review of all
-- clients that may directly invoke the private worker function.
-- Do NOT run on production until confirmed that only the HARMONY cron worker
-- and trusted definer functions require direct EXECUTE.
-- Does NOT change balances, profiles, cycles, or historical records.
BEGIN;
DO $preflight$
BEGIN
  IF to_regprocedure('public.harmony_reconcile_leave_lifecycle_one(uuid,date,text)') IS NULL THEN
    RAISE EXCEPTION 'Internal lifecycle RPC is missing: abort without changes';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
    RAISE EXCEPTION 'Supabase service_role is missing: abort without changes';
  END IF;
END
$preflight$;
REVOKE ALL ON FUNCTION public.harmony_reconcile_leave_lifecycle_one(uuid,date,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.harmony_reconcile_leave_lifecycle_one(uuid,date,text)
  TO service_role;
COMMIT;
-- Rollback of function grants (only after reviewing prior direct GRANTs):
-- GRANT EXECUTE ON FUNCTION public.harmony_reconcile_leave_lifecycle_one(uuid,date,text) TO authenticated;
-- Do NOT grant PUBLIC/anon access without reviewing the data-integrity implications.

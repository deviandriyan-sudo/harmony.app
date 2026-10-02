-- HARMONY + RE-MED V2.2 PRECHECK (READ ONLY)
select * from (
  select 1 as sort_no, '01_remed_claims' as check_name, coalesce(to_regclass('public.remed_claims')::text,'MISSING') as result
  union all select 2, '02_remed_entitlements', coalesce(to_regclass('public.remed_entitlements')::text,'MISSING')
  union all select 3, '03_status_logs_compact', coalesce(to_regclass('harmony_audit.remed_status_logs')::text,'MISSING')
  union all select 4, '04_payment_logs_compact', coalesce(to_regclass('harmony_audit.remed_payment_logs')::text,'MISSING')
  union all select 5, '05_audit_logs_compact', coalesce(to_regclass('harmony_audit.remed_audit_logs')::text,'MISSING')
  union all select 6, '06_claim_count', count(*)::text from public.remed_claims
  union all select 7, '07_entitlement_count', count(*)::text from public.remed_entitlements
) x order by sort_no;

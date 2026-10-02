-- HARMONY + RE-MED V2.2 POSTCHECK (READ ONLY)
select * from (
  select 1 as sort_no, '01_delete_rpc' as check_name,
    count(*)::text as result
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='remed_delete_claim_v2'

  union all
  select 2, '02_history_rpc', count(*)::text
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='remed_get_process_history_v2'

  union all
  select 3, '03_claim_rows', count(*)::text from public.remed_claims

  union all
  select 4, '04_status_history_rows', count(*)::text from harmony_audit.remed_status_logs

  union all
  select 5, '05_payment_history_rows', count(*)::text from harmony_audit.remed_payment_logs

  union all
  select 6, '06_deleted_tombstones', count(*)::text
  from harmony_audit.remed_audit_logs
  where action='claim_deleted' and entity_type='remed_claim'
) checks
order by sort_no;

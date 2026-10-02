-- HARMONY + RE-MED V2.4
-- HISTORY CLEANUP POSTCHECK (READ ONLY)

with checks as (
  select 1 as sort_order, '01_history_purge_rpc'::text as check_name,
         case when to_regprocedure('public.remed_purge_deleted_claim_history_v3(uuid,uuid,text,text)') is not null then 'OK' else 'MISSING' end as status,
         coalesce(to_regprocedure('public.remed_purge_deleted_claim_history_v3(uuid,uuid,text,text)')::text, '-') as detail
  union all
  select 2, '02_deleted_claim_tombstones', 'INFO',
         count(*)::text
  from harmony_audit.remed_audit_logs
  where action = 'claim_deleted' and entity_type = 'remed_claim'
  union all
  select 3, '03_archived_history_rows', 'INFO',
         count(*)::text
  from harmony_audit.remed_audit_logs
  where action = 'claim_history_archived' and entity_type = 'remed_claim'
  union all
  select 4, '04_history_cleanup_audits', 'INFO',
         count(*)::text
  from harmony_audit.remed_audit_logs
  where action = 'deleted_claim_history_purged' and entity_type = 'remed_history_cleanup'
)
select check_name, status, detail
from checks
order by sort_order;

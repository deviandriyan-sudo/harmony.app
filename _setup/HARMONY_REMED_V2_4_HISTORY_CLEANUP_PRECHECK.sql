-- HARMONY + RE-MED V2.4
-- HISTORY CLEANUP PRECHECK (READ ONLY)
-- Single-result output for easy CSV export.

with checks as (
  select 1 as sort_order, '01_remed_claims'::text as check_name,
         case when to_regclass('public.remed_claims') is not null then 'OK' else 'MISSING' end as status,
         coalesce((select count(*)::text from public.remed_claims), '0') as detail
  union all
  select 2, '02_remed_user_access',
         case when to_regclass('public.remed_user_access') is not null then 'OK' else 'MISSING' end,
         coalesce((select count(*)::text from public.remed_user_access), '0')
  union all
  select 3, '03_audit_logs',
         case when to_regclass('harmony_audit.remed_audit_logs') is not null then 'OK' else 'MISSING' end,
         coalesce((select count(*)::text from harmony_audit.remed_audit_logs), '0')
  union all
  select 4, '04_deleted_claim_tombstones', 'INFO',
         coalesce((select count(*)::text
                   from harmony_audit.remed_audit_logs
                   where action = 'claim_deleted' and entity_type = 'remed_claim'), '0')
  union all
  select 5, '05_archived_history_rows', 'INFO',
         coalesce((select count(*)::text
                   from harmony_audit.remed_audit_logs
                   where action = 'claim_history_archived' and entity_type = 'remed_claim'), '0')
)
select check_name, status, detail
from checks
order by sort_order;

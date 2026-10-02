-- HARMONY Re-Med V2.3 — Signature Management PRECHECK
-- READ ONLY
with checks as (
  select '01_employees_table' as check_name,
         case when to_regclass('public.employees') is not null then 'OK' else 'MISSING' end as result,
         null::text as detail
  union all
  select '02_remed_claims_table',
         case when to_regclass('public.remed_claims') is not null then 'OK' else 'MISSING' end,
         null
  union all
  select '03_devi_employee',
         case when count(*) = 1 then 'OK' else 'CHECK' end,
         'employee_number=1010793; rows=' || count(*)::text
  from public.employees where employee_number='1010793'
  union all
  select '04_nova_employee',
         case when count(*) = 1 then 'OK' else 'CHECK' end,
         'employee_number=1010801; rows=' || count(*)::text
  from public.employees where employee_number='1010801'
  union all
  select '05_signature_table_existing',
         case when to_regclass('public.remed_signature_profiles') is null then 'NOT_YET' else 'EXISTS' end,
         null
  union all
  select '06_signature_bucket_existing',
         case when exists(select 1 from storage.buckets where id='remed-signatures') then 'EXISTS' else 'NOT_YET' end,
         null
)
select * from checks order by check_name;

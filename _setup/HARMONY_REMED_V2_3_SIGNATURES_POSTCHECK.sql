-- HARMONY Re-Med V2.3 — Signature Management POSTCHECK
with results as (
  select '01_signature_table' as check_name,
         case when to_regclass('public.remed_signature_profiles') is not null then 'OK' else 'FAIL' end as result,
         null::text as detail
  union all
  select '02_signature_bucket',
         case when exists(select 1 from storage.buckets where id='remed-signatures' and public=false) then 'OK' else 'FAIL' end,
         (select 'public=' || public::text || '; max=' || coalesce(file_size_limit::text,'null') from storage.buckets where id='remed-signatures')
  union all
  select '03_hr_signer',
         case when count(*)=1 then 'OK' else 'FAIL' end,
         coalesce(max(e.employee_number || ' · ' || e.full_name),'none')
  from public.remed_signature_profiles p
  join public.employees e on e.id=p.employee_id
  where p.signer_role='hr'
  union all
  select '04_finance_signer',
         case when count(*)=1 then 'OK' else 'FAIL' end,
         coalesce(max(e.employee_number || ' · ' || e.full_name),'none')
  from public.remed_signature_profiles p
  join public.employees e on e.id=p.employee_id
  where p.signer_role='finance'
  union all
  select '05_private_signature_objects',
         case when count(*) >= 34 then 'OK' else 'CHECK' end,
         'imported=' || count(*)::text || '; seed=' || (count(*) filter (where signature_origin='seed'))::text || '; upload=' || (count(*) filter (where signature_origin='upload'))::text
  from public.remed_signature_profiles
  where signature_path is not null
  union all
  select '06_hr_snapshot_column',
         case when exists(
           select 1 from information_schema.columns
           where table_schema='public' and table_name='remed_claims' and column_name='hr_signatory_employee_id'
         ) then 'OK' else 'FAIL' end,
         null
  union all
  select '07_finance_snapshot_column',
         case when exists(
           select 1 from information_schema.columns
           where table_schema='public' and table_name='remed_claims' and column_name='finance_signatory_employee_id'
         ) then 'OK' else 'FAIL' end,
         null
  union all
  select '08_role_rpc',
         case when to_regprocedure('public.remed_set_signatory_v1(text,uuid,uuid)') is not null then 'OK' else 'FAIL' end,
         null
)
select * from results order by check_name;

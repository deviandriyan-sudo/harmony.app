-- HARMONY DATABASE COMPACT V2 - PRECHECK
-- READ ONLY. Tidak membuat/mengubah/menghapus object database.
-- Jalankan SELURUH query ini sekali jalan, lalu Export CSV hasilnya.

with
relevant_tables as (
  select
    c.oid,
    n.nspname as schema_name,
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as rls_forced,
    coalesce(s.n_live_tup, c.reltuples::bigint, 0) as estimated_rows
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_stat_user_tables s on s.relid = c.oid
  where n.nspname = 'public'
    and c.relkind in ('r','p')
    and (
      c.relname like 'phl\_%' escape '\'
      or c.relname like 'remed\_%' escape '\'
      or c.relname in (
        'employees',
        'app_users',
        'requests',
        'leave_requests',
        'attendance_logs',
        'harmony_attachments'
      )
    )
),
source_usage(table_name, direct_app_files, source_role, target_action) as (
  values
    ('phl_records', 8, 'CANONICAL PHL request/claim table used directly by app', 'KEEP_CANONICAL'),
    ('phl_hr_adjustments', 3, 'HR manual PHL adjustment used directly by app', 'LEDGER_MERGE_CANDIDATE'),
    ('phl_balances', 0, 'PHL balance table; likely consumed by RPC/functions', 'KEEP_UNTIL_LEDGER_RECONCILIATION'),

    ('remed_user_access', 2, 'Re-Med authorization', 'KEEP'),
    ('remed_entitlements', 2, 'Re-Med plafond/balance', 'KEEP'),
    ('remed_claims', 4, 'Canonical Re-Med claim', 'KEEP'),
    ('remed_claim_types', 2, 'Configurable Re-Med claim type', 'KEEP'),
    ('remed_claim_attachments', 4, 'Claim/payment documents', 'MERGE_OR_RENAME_TO_REMED_DOCUMENTS'),
    ('remed_status_logs', 0, 'Claim status event history', 'MERGE_TO_REMED_EVENTS_CANDIDATE'),
    ('remed_payment_logs', 0, 'Payment event history', 'MERGE_TO_REMED_EVENTS_CANDIDATE'),
    ('remed_audit_logs', 2, 'Re-Med audit event history', 'MERGE_TO_REMED_EVENTS_CANDIDATE'),
    ('remed_claim_sequences', 0, 'Application-managed claim numbering counter', 'REPLACE_WITH_NATIVE_PG_SEQUENCE_CANDIDATE'),
    ('remed_legacy_imports', 0, 'Legacy migration snapshot', 'MOVE_TO_ARCHIVE_CANDIDATE')
),
columns_json as (
  select
    rt.table_name,
    jsonb_agg(
      jsonb_build_object(
        'name', a.attname,
        'type', pg_catalog.format_type(a.atttypid, a.atttypmod),
        'nullable', not a.attnotnull,
        'default', pg_get_expr(ad.adbin, ad.adrelid),
        'identity', nullif(a.attidentity, ''),
        'generated', nullif(a.attgenerated, '')
      ) order by a.attnum
    ) as columns
  from relevant_tables rt
  join pg_attribute a on a.attrelid = rt.oid
  left join pg_attrdef ad on ad.adrelid = a.attrelid and ad.adnum = a.attnum
  where a.attnum > 0 and not a.attisdropped
  group by rt.table_name
),
constraints_json as (
  select
    rt.table_name,
    jsonb_agg(
      jsonb_build_object(
        'name', con.conname,
        'type', case con.contype
          when 'p' then 'PRIMARY KEY'
          when 'f' then 'FOREIGN KEY'
          when 'u' then 'UNIQUE'
          when 'c' then 'CHECK'
          when 'x' then 'EXCLUSION'
          else con.contype::text
        end,
        'definition', pg_get_constraintdef(con.oid, true)
      ) order by con.conname
    ) as constraints
  from relevant_tables rt
  join pg_constraint con on con.conrelid = rt.oid
  group by rt.table_name
),
referencing_fk_json as (
  select
    rt.table_name,
    jsonb_agg(
      jsonb_build_object(
        'constraint', con.conname,
        'from_table', n2.nspname || '.' || c2.relname,
        'definition', pg_get_constraintdef(con.oid, true)
      ) order by c2.relname, con.conname
    ) as referenced_by
  from relevant_tables rt
  join pg_constraint con on con.confrelid = rt.oid and con.contype = 'f'
  join pg_class c2 on c2.oid = con.conrelid
  join pg_namespace n2 on n2.oid = c2.relnamespace
  group by rt.table_name
),
indexes_json as (
  select
    rt.table_name,
    jsonb_agg(
      jsonb_build_object(
        'name', i.indexname,
        'definition', i.indexdef
      ) order by i.indexname
    ) as indexes
  from relevant_tables rt
  join pg_indexes i
    on i.schemaname = rt.schema_name
   and i.tablename = rt.table_name
  group by rt.table_name
),
policies_json as (
  select
    rt.table_name,
    jsonb_agg(
      jsonb_build_object(
        'name', p.policyname,
        'permissive', p.permissive,
        'roles', p.roles,
        'command', p.cmd,
        'using', p.qual,
        'with_check', p.with_check
      ) order by p.policyname
    ) as policies
  from relevant_tables rt
  join pg_policies p
    on p.schemaname = rt.schema_name
   and p.tablename = rt.table_name
  group by rt.table_name
),
triggers_json as (
  select
    rt.table_name,
    jsonb_agg(
      jsonb_build_object(
        'name', t.tgname,
        'definition', pg_get_triggerdef(t.oid, true)
      ) order by t.tgname
    ) as triggers
  from relevant_tables rt
  join pg_trigger t on t.tgrelid = rt.oid
  where not t.tgisinternal
  group by rt.table_name
),
views_json as (
  select
    rt.table_name,
    jsonb_agg(
      jsonb_build_object(
        'view_schema', v.view_schema,
        'view_name', v.view_name
      ) order by v.view_schema, v.view_name
    ) as dependent_views
  from relevant_tables rt
  join information_schema.view_table_usage v
    on v.table_schema = rt.schema_name
   and v.table_name = rt.table_name
  group by rt.table_name
),
function_base as (
  select
    p.oid,
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as identity_args,
    pg_get_function_result(p.oid) as result_type,
    l.lanname as language,
    p.prosecdef as security_definer,
    pg_get_functiondef(p.oid) as definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join pg_language l on l.oid = p.prolang
  where n.nspname = 'public'
),
relevant_functions as (
  select *
  from function_base
  where function_name ilike '%phl%'
     or function_name ilike '%remed%'
     or definition ilike '%phl\_%' escape '\'
     or definition ilike '%remed\_%' escape '\'
),
function_dependencies as (
  select
    rt.table_name,
    jsonb_agg(
      jsonb_build_object(
        'function', rf.function_name,
        'args', rf.identity_args,
        'security_definer', rf.security_definer
      ) order by rf.function_name, rf.identity_args
    ) as dependent_functions
  from relevant_tables rt
  join relevant_functions rf
    on rf.definition ilike ('%' || rt.table_name || '%')
  group by rt.table_name
),
summary as (
  select jsonb_build_object(
    'generated_at', now(),
    'relevant_table_count', count(*),
    'phl_table_count', count(*) filter (where table_name like 'phl\_%' escape '\'),
    'remed_table_count', count(*) filter (where table_name like 'remed\_%' escape '\'),
    'rls_enabled_count', count(*) filter (where rls_enabled),
    'rls_disabled_count', count(*) filter (where not rls_enabled),
    'note', 'READ ONLY precheck. Estimated row counts come from PostgreSQL statistics and may be approximate.'
  ) as details
  from relevant_tables
)
select
  0 as sort_group,
  'SUMMARY'::text as section,
  'DATABASE_COMPACT_V2'::text as object_name,
  'summary'::text as object_type,
  null::bigint as estimated_rows,
  null::boolean as rls_enabled,
  null::boolean as rls_forced,
  null::integer as direct_app_files,
  'AUDIT_ONLY'::text as target_action,
  'Database-wide compact audit summary'::text as source_role,
  summary.details as details_json,
  null::text as definition
from summary

union all

select
  1 as sort_group,
  'TABLE'::text as section,
  rt.schema_name || '.' || rt.table_name as object_name,
  'table'::text as object_type,
  rt.estimated_rows,
  rt.rls_enabled,
  rt.rls_forced,
  coalesce(su.direct_app_files, 0) as direct_app_files,
  coalesce(
    su.target_action,
    case
      when rt.table_name like 'phl\_%' escape '\' then 'AUDIT_FOR_PHL_LEDGER_OR_ARCHIVE'
      when rt.table_name like 'remed\_%' escape '\' then 'AUDIT_REMED_RUNTIME_DEPENDENCY'
      else 'SHARED_CORE_KEEP'
    end
  ) as target_action,
  coalesce(su.source_role, 'Shared/core table or indirect dependency') as source_role,
  jsonb_build_object(
    'columns', coalesce(cj.columns, '[]'::jsonb),
    'constraints', coalesce(coj.constraints, '[]'::jsonb),
    'referenced_by_fk', coalesce(rfj.referenced_by, '[]'::jsonb),
    'indexes', coalesce(ij.indexes, '[]'::jsonb),
    'policies', coalesce(pj.policies, '[]'::jsonb),
    'triggers', coalesce(tj.triggers, '[]'::jsonb),
    'dependent_views', coalesce(vj.dependent_views, '[]'::jsonb),
    'dependent_functions', coalesce(fd.dependent_functions, '[]'::jsonb)
  ) as details_json,
  null::text as definition
from relevant_tables rt
left join source_usage su on su.table_name = rt.table_name
left join columns_json cj on cj.table_name = rt.table_name
left join constraints_json coj on coj.table_name = rt.table_name
left join referencing_fk_json rfj on rfj.table_name = rt.table_name
left join indexes_json ij on ij.table_name = rt.table_name
left join policies_json pj on pj.table_name = rt.table_name
left join triggers_json tj on tj.table_name = rt.table_name
left join views_json vj on vj.table_name = rt.table_name
left join function_dependencies fd on fd.table_name = rt.table_name

union all

select
  2 as sort_group,
  'FUNCTION'::text as section,
  rf.schema_name || '.' || rf.function_name || '(' || rf.identity_args || ')' as object_name,
  'function'::text as object_type,
  null::bigint as estimated_rows,
  null::boolean as rls_enabled,
  null::boolean as rls_forced,
  null::integer as direct_app_files,
  'AUDIT_FUNCTION_DEPENDENCY'::text as target_action,
  ('language=' || rf.language || '; security_definer=' || rf.security_definer::text || '; returns=' || rf.result_type)::text as source_role,
  jsonb_build_object(
    'referenced_relevant_tables', coalesce((
      select jsonb_agg(rt.table_name order by rt.table_name)
      from relevant_tables rt
      where rf.definition ilike ('%' || rt.table_name || '%')
    ), '[]'::jsonb)
  ) as details_json,
  rf.definition
from relevant_functions rf

order by sort_group, object_name;

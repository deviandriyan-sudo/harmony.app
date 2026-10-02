-- HARMONY + RE-MED V2.2
-- ADMIN TOOLS: SAFE DELETE + UNIFIED PROCESS HISTORY
-- Requires HARMONY DATABASE COMPACT V2 to be active.
-- Idempotent: CREATE OR REPLACE only. No existing claim rows are modified by this migration.

begin;

-- Guard: stop early if the canonical Re-Med objects are not available.
do $guard$
begin
  if to_regclass('public.remed_claims') is null then
    raise exception 'remed_claims tidak ditemukan. Jalankan baseline Re-Med terlebih dahulu.';
  end if;
  if to_regclass('public.remed_entitlements') is null then
    raise exception 'remed_entitlements tidak ditemukan.';
  end if;
  if to_regclass('harmony_audit.remed_status_logs') is null then
    raise exception 'harmony_audit.remed_status_logs tidak ditemukan. Compact V2 belum aktif.';
  end if;
  if to_regclass('harmony_audit.remed_payment_logs') is null then
    raise exception 'harmony_audit.remed_payment_logs tidak ditemukan. Compact V2 belum aktif.';
  end if;
  if to_regclass('harmony_audit.remed_audit_logs') is null then
    raise exception 'harmony_audit.remed_audit_logs tidak ditemukan. Compact V2 belum aktif.';
  end if;
end
$guard$;

create or replace function public.remed_delete_claim_v2(
  p_claim_id uuid,
  p_actor_auth_user_id uuid,
  p_actor_email text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, harmony_audit
as $remed_delete$
declare
  v_claim public.remed_claims%rowtype;
  v_role text;
  v_amount numeric := 0;
  v_year integer;
  v_storage_paths text[] := array[]::text[];
  v_claim_json jsonb;
  v_employee_name text;
  v_claim_type_name text;
begin
  select role
  into v_role
  from public.remed_user_access
  where auth_user_id = p_actor_auth_user_id
    and is_active
    and role in ('hr','finance')
  limit 1;

  if v_role is null then
    raise exception 'Akses hapus klaim Re-Med ditolak.';
  end if;

  if nullif(trim(coalesce(p_reason,'')), '') is null then
    raise exception 'Alasan penghapusan wajib diisi.';
  end if;

  select *
  into v_claim
  from public.remed_claims
  where id = p_claim_id
  for update;

  if not found then
    raise exception 'Klaim tidak ditemukan.';
  end if;

  v_claim_json := to_jsonb(v_claim);
  v_year := extract(year from v_claim.treatment_date)::integer;

  select e.full_name
  into v_employee_name
  from public.employees e
  where e.id = v_claim.employee_id;

  select t.name
  into v_claim_type_name
  from public.remed_claim_types t
  where t.id = v_claim.claim_type_id;

  select coalesce(array_agg(a.storage_path order by a.created_at), array[]::text[])
  into v_storage_paths
  from public.remed_claim_attachments a
  where a.claim_id = v_claim.id;

  if v_claim.payment_proof_path is not null
     and not (v_claim.payment_proof_path = any(v_storage_paths)) then
    v_storage_paths := array_append(v_storage_paths, v_claim.payment_proof_path);
  end if;

  -- Reverse only the balance effect still represented by the claim's current state.
  if v_claim.affects_entitlement then
    if v_claim.status = 'pending_hr' then
      update public.remed_entitlements
      set reserved_amount = greatest(0, reserved_amount - v_claim.submitted_amount)
      where employee_id = v_claim.employee_id
        and period_year = v_year;

    elsif v_claim.status in ('pending_finance','waiting_payment') then
      v_amount := coalesce(v_claim.approved_amount, v_claim.submitted_amount);
      update public.remed_entitlements
      set reserved_amount = greatest(0, reserved_amount - v_amount)
      where employee_id = v_claim.employee_id
        and period_year = v_year;

    elsif v_claim.status = 'paid' then
      v_amount := coalesce(v_claim.approved_amount, v_claim.submitted_amount);
      update public.remed_entitlements
      set current_used = greatest(0, current_used - v_amount)
      where employee_id = v_claim.employee_id
        and period_year = v_year;
    end if;
  end if;

  -- Preserve every status transition before the operational claim is hard-deleted.
  insert into harmony_audit.remed_audit_logs(
    actor_auth_user_id, actor_email, actor_role, action, entity_type, entity_id, metadata, created_at
  )
  select
    sl.actor_auth_user_id,
    sl.actor_email,
    sl.actor_role,
    'claim_history_archived',
    'remed_claim',
    v_claim.id,
    jsonb_build_object(
      'status_log_id', sl.id,
      'claim_number', v_claim.claim_number,
      'employee_id', v_claim.employee_id,
      'employee_name', v_employee_name,
      'claim_type_name', v_claim_type_name,
      'treatment_date', v_claim.treatment_date,
      'submitted_amount', v_claim.submitted_amount,
      'approved_amount', v_claim.approved_amount,
      'from_status', sl.from_status,
      'to_status', sl.to_status,
      'note', sl.note
    ),
    sl.created_at
  from harmony_audit.remed_status_logs sl
  where sl.claim_id = v_claim.id;

  -- Payment log uses ON DELETE RESTRICT, therefore remove audit children first.
  delete from harmony_audit.remed_payment_logs where claim_id = v_claim.id;
  delete from harmony_audit.remed_status_logs where claim_id = v_claim.id;
  delete from public.remed_claim_attachments where claim_id = v_claim.id;
  delete from public.remed_claims where id = v_claim.id;

  -- Preserve a tombstone audit snapshot even though the operational claim is removed.
  insert into harmony_audit.remed_audit_logs(
    actor_auth_user_id,
    actor_email,
    actor_role,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values(
    p_actor_auth_user_id,
    p_actor_email,
    v_role,
    'claim_deleted',
    'remed_claim',
    p_claim_id,
    jsonb_build_object(
      'reason', trim(p_reason),
      'deleted_status', v_claim.status,
      'employee_name', v_employee_name,
      'claim_type_name', v_claim_type_name,
      'claim', v_claim_json,
      'storage_paths', to_jsonb(v_storage_paths)
    )
  );

  return jsonb_build_object(
    'success', true,
    'claim_id', p_claim_id,
    'claim_number', v_claim.claim_number,
    'deleted_status', v_claim.status,
    'storage_paths', to_jsonb(v_storage_paths)
  );
end;
$remed_delete$;

revoke execute on function public.remed_delete_claim_v2(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.remed_delete_claim_v2(uuid,uuid,text,text) to service_role;

create or replace function public.remed_get_process_history_v2(
  p_actor_auth_user_id uuid,
  p_limit integer default 500
)
returns table(
  event_id uuid,
  claim_id uuid,
  claim_number text,
  employee_id uuid,
  employee_name text,
  claim_type_name text,
  treatment_date date,
  submitted_amount numeric,
  approved_amount numeric,
  from_status text,
  to_status text,
  current_status text,
  actor_role text,
  actor_email text,
  note text,
  event_at timestamptz,
  is_deleted boolean
)
language plpgsql
security definer
set search_path = public, harmony_audit
as $remed_history$
declare
  v_role text;
  v_limit integer := least(greatest(coalesce(p_limit,500),1),1000);
begin
  select role
  into v_role
  from public.remed_user_access
  where auth_user_id = p_actor_auth_user_id
    and is_active
    and role in ('hr','finance')
  limit 1;

  if v_role is null then
    raise exception 'Akses riwayat Re-Med ditolak.';
  end if;

  return query
  with live_events as (
    select
      sl.id as event_id,
      c.id as claim_id,
      c.claim_number,
      c.employee_id,
      e.full_name as employee_name,
      ct.name as claim_type_name,
      c.treatment_date,
      c.submitted_amount,
      c.approved_amount,
      sl.from_status,
      sl.to_status,
      c.status as current_status,
      sl.actor_role,
      sl.actor_email,
      sl.note,
      sl.created_at as event_at,
      false as is_deleted
    from harmony_audit.remed_status_logs sl
    join public.remed_claims c on c.id = sl.claim_id
    left join public.employees e on e.id = c.employee_id
    left join public.remed_claim_types ct on ct.id = c.claim_type_id
  ),
  archived_events as (
    select
      al.id as event_id,
      al.entity_id as claim_id,
      al.metadata->>'claim_number' as claim_number,
      nullif(al.metadata->>'employee_id','')::uuid as employee_id,
      coalesce(al.metadata->>'employee_name','-') as employee_name,
      coalesce(al.metadata->>'claim_type_name','-') as claim_type_name,
      nullif(al.metadata->>'treatment_date','')::date as treatment_date,
      nullif(al.metadata->>'submitted_amount','')::numeric as submitted_amount,
      nullif(al.metadata->>'approved_amount','')::numeric as approved_amount,
      al.metadata->>'from_status' as from_status,
      al.metadata->>'to_status' as to_status,
      'deleted'::text as current_status,
      al.actor_role,
      al.actor_email,
      al.metadata->>'note' as note,
      al.created_at as event_at,
      true as is_deleted
    from harmony_audit.remed_audit_logs al
    where al.action = 'claim_history_archived'
      and al.entity_type = 'remed_claim'
  ),
  deleted_events as (
    select
      al.id as event_id,
      al.entity_id as claim_id,
      al.metadata->'claim'->>'claim_number' as claim_number,
      nullif(al.metadata->'claim'->>'employee_id','')::uuid as employee_id,
      coalesce(al.metadata->>'employee_name','-') as employee_name,
      coalesce(al.metadata->>'claim_type_name','-') as claim_type_name,
      nullif(al.metadata->'claim'->>'treatment_date','')::date as treatment_date,
      nullif(al.metadata->'claim'->>'submitted_amount','')::numeric as submitted_amount,
      nullif(al.metadata->'claim'->>'approved_amount','')::numeric as approved_amount,
      al.metadata->>'deleted_status' as from_status,
      'deleted'::text as to_status,
      'deleted'::text as current_status,
      al.actor_role,
      al.actor_email,
      al.metadata->>'reason' as note,
      al.created_at as event_at,
      true as is_deleted
    from harmony_audit.remed_audit_logs al
    where al.action = 'claim_deleted'
      and al.entity_type = 'remed_claim'
  )
  select *
  from (
    select * from live_events
    union all
    select * from archived_events
    union all
    select * from deleted_events
  ) x
  order by x.event_at desc
  limit v_limit;
end;
$remed_history$;

revoke execute on function public.remed_get_process_history_v2(uuid,integer) from public, anon, authenticated;
grant execute on function public.remed_get_process_history_v2(uuid,integer) to service_role;

commit;

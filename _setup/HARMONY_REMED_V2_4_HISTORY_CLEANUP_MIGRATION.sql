-- HARMONY + RE-MED V2.4
-- HR DELETED-CLAIM HISTORY CLEANUP
-- Adds an HR-only RPC to permanently purge archived history for a claim that
-- has ALREADY been deleted from operational Re-Med data.
-- It does NOT change entitlement balances, claim balances, PHL, leave, or attendance.

begin;

do $guard$
begin
  if to_regclass('public.remed_claims') is null then
    raise exception 'public.remed_claims tidak ditemukan.';
  end if;
  if to_regclass('public.remed_user_access') is null then
    raise exception 'public.remed_user_access tidak ditemukan.';
  end if;
  if to_regclass('harmony_audit.remed_audit_logs') is null then
    raise exception 'harmony_audit.remed_audit_logs tidak ditemukan.';
  end if;
end
$guard$;

create or replace function public.remed_purge_deleted_claim_history_v3(
  p_claim_id uuid,
  p_actor_auth_user_id uuid,
  p_actor_email text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, harmony_audit
as $remed_history_purge$
declare
  v_role text;
  v_tombstone jsonb;
  v_claim_number text;
  v_employee_name text;
  v_storage_paths text[] := array[]::text[];
  v_audit_rows integer := 0;
  v_status_rows integer := 0;
  v_payment_rows integer := 0;
begin
  select role
  into v_role
  from public.remed_user_access
  where auth_user_id = p_actor_auth_user_id
    and is_active
    and role = 'hr'
  limit 1;

  if v_role is null then
    raise exception 'Hanya HR yang dapat menghapus Riwayat Proses Re-Med.';
  end if;

  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'Alasan penghapusan riwayat wajib diisi.';
  end if;

  -- Never purge lifecycle history while the operational claim is still active.
  if exists(select 1 from public.remed_claims where id = p_claim_id) then
    raise exception 'Klaim masih aktif. Hapus klaim dari Dashboard terlebih dahulu sebelum membersihkan riwayatnya.';
  end if;

  select al.metadata
  into v_tombstone
  from harmony_audit.remed_audit_logs al
  where al.action = 'claim_deleted'
    and al.entity_type = 'remed_claim'
    and al.entity_id = p_claim_id
  order by al.created_at desc
  limit 1;

  if v_tombstone is null then
    raise exception 'Tombstone penghapusan klaim tidak ditemukan. Riwayat aktif/tanpa bukti delete tidak boleh dipurge.';
  end if;

  v_claim_number := coalesce(v_tombstone->'claim'->>'claim_number', p_claim_id::text);
  v_employee_name := coalesce(v_tombstone->>'employee_name', '-');

  select coalesce(array_agg(path_value), array[]::text[])
  into v_storage_paths
  from jsonb_array_elements_text(coalesce(v_tombstone->'storage_paths', '[]'::jsonb)) as paths(path_value);

  -- Defensive cleanup. Normally these child rows were already archived/deleted by remed_delete_claim_v2.
  delete from harmony_audit.remed_payment_logs where claim_id = p_claim_id;
  get diagnostics v_payment_rows = row_count;

  delete from harmony_audit.remed_status_logs where claim_id = p_claim_id;
  get diagnostics v_status_rows = row_count;

  -- Remove every claim-specific audit record, including archived transitions,
  -- delete tombstone, receipt-upload audit, and other operational claim audit rows.
  delete from harmony_audit.remed_audit_logs
  where entity_type = 'remed_claim'
    and entity_id = p_claim_id;
  get diagnostics v_audit_rows = row_count;

  -- Keep one administrative cleanup record outside the process-history feed.
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
    'hr',
    'deleted_claim_history_purged',
    'remed_history_cleanup',
    p_claim_id,
    jsonb_build_object(
      'reason', trim(p_reason),
      'claim_number', v_claim_number,
      'employee_name', v_employee_name,
      'audit_rows_deleted', v_audit_rows,
      'status_rows_deleted', v_status_rows,
      'payment_rows_deleted', v_payment_rows,
      'storage_paths', to_jsonb(v_storage_paths)
    )
  );

  return jsonb_build_object(
    'success', true,
    'claim_id', p_claim_id,
    'claim_number', v_claim_number,
    'audit_rows_deleted', v_audit_rows,
    'status_rows_deleted', v_status_rows,
    'payment_rows_deleted', v_payment_rows,
    'storage_paths', to_jsonb(v_storage_paths)
  );
end;
$remed_history_purge$;

revoke execute on function public.remed_purge_deleted_claim_history_v3(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.remed_purge_deleted_claim_history_v3(uuid,uuid,text,text) to service_role;

commit;

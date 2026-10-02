-- HARMONY DATABASE COMPACT V2 - ROLLBACK
-- Use only if Compact V2 migration succeeded but must be reverted.
-- This restores the original public-table locations and original live function definitions.
-- Re-Med audit RPC is retained so both old and new source remain compatible during rollback.

begin;

drop view if exists public.remed_audit_logs;
drop function if exists public.remed_audit_logs_compat_insert();


do $move$
begin
  if to_regclass('harmony_audit.phl_attendance_credit_audit_logs') is not null and to_regclass('public.phl_attendance_credit_audit_logs') is not null then
    raise exception 'Rollback berhenti: harmony_audit.phl_attendance_credit_audit_logs dan public.phl_attendance_credit_audit_logs sama-sama ada.';
  elsif to_regclass('harmony_audit.phl_attendance_credit_audit_logs') is not null then
    execute 'alter table harmony_audit.phl_attendance_credit_audit_logs set schema public';
  end if;
end
$move$;


do $move$
begin
  if to_regclass('harmony_audit.phl_claim_audit_logs') is not null and to_regclass('public.phl_claim_audit_logs') is not null then
    raise exception 'Rollback berhenti: harmony_audit.phl_claim_audit_logs dan public.phl_claim_audit_logs sama-sama ada.';
  elsif to_regclass('harmony_audit.phl_claim_audit_logs') is not null then
    execute 'alter table harmony_audit.phl_claim_audit_logs set schema public';
  end if;
end
$move$;


do $move$
begin
  if to_regclass('harmony_audit.phl_reconciliation_audit_logs') is not null and to_regclass('public.phl_reconciliation_audit_logs') is not null then
    raise exception 'Rollback berhenti: harmony_audit.phl_reconciliation_audit_logs dan public.phl_reconciliation_audit_logs sama-sama ada.';
  elsif to_regclass('harmony_audit.phl_reconciliation_audit_logs') is not null then
    execute 'alter table harmony_audit.phl_reconciliation_audit_logs set schema public';
  end if;
end
$move$;


do $move$
begin
  if to_regclass('harmony_audit.remed_audit_logs') is not null and to_regclass('public.remed_audit_logs') is not null then
    raise exception 'Rollback berhenti: harmony_audit.remed_audit_logs dan public.remed_audit_logs sama-sama ada.';
  elsif to_regclass('harmony_audit.remed_audit_logs') is not null then
    execute 'alter table harmony_audit.remed_audit_logs set schema public';
  end if;
end
$move$;


do $move$
begin
  if to_regclass('harmony_audit.remed_payment_logs') is not null and to_regclass('public.remed_payment_logs') is not null then
    raise exception 'Rollback berhenti: harmony_audit.remed_payment_logs dan public.remed_payment_logs sama-sama ada.';
  elsif to_regclass('harmony_audit.remed_payment_logs') is not null then
    execute 'alter table harmony_audit.remed_payment_logs set schema public';
  end if;
end
$move$;


do $move$
begin
  if to_regclass('harmony_audit.remed_status_logs') is not null and to_regclass('public.remed_status_logs') is not null then
    raise exception 'Rollback berhenti: harmony_audit.remed_status_logs dan public.remed_status_logs sama-sama ada.';
  elsif to_regclass('harmony_audit.remed_status_logs') is not null then
    execute 'alter table harmony_audit.remed_status_logs set schema public';
  end if;
end
$move$;


do $move$
begin
  if to_regclass('harmony_internal.phl_claim_allocations') is not null and to_regclass('public.phl_claim_allocations') is not null then
    raise exception 'Rollback berhenti: harmony_internal.phl_claim_allocations dan public.phl_claim_allocations sama-sama ada.';
  elsif to_regclass('harmony_internal.phl_claim_allocations') is not null then
    execute 'alter table harmony_internal.phl_claim_allocations set schema public';
  end if;
end
$move$;


do $move$
begin
  if to_regclass('harmony_internal.phl_claim_usages') is not null and to_regclass('public.phl_claim_usages') is not null then
    raise exception 'Rollback berhenti: harmony_internal.phl_claim_usages dan public.phl_claim_usages sama-sama ada.';
  elsif to_regclass('harmony_internal.phl_claim_usages') is not null then
    execute 'alter table harmony_internal.phl_claim_usages set schema public';
  end if;
end
$move$;


do $move$
begin
  if to_regclass('harmony_internal.phl_employee_legacy_balances') is not null and to_regclass('public.phl_employee_legacy_balances') is not null then
    raise exception 'Rollback berhenti: harmony_internal.phl_employee_legacy_balances dan public.phl_employee_legacy_balances sama-sama ada.';
  elsif to_regclass('harmony_internal.phl_employee_legacy_balances') is not null then
    execute 'alter table harmony_internal.phl_employee_legacy_balances set schema public';
  end if;
end
$move$;


do $move$
begin
  if to_regclass('harmony_internal.phl_hr_adjustment_allocations') is not null and to_regclass('public.phl_hr_adjustment_allocations') is not null then
    raise exception 'Rollback berhenti: harmony_internal.phl_hr_adjustment_allocations dan public.phl_hr_adjustment_allocations sama-sama ada.';
  elsif to_regclass('harmony_internal.phl_hr_adjustment_allocations') is not null then
    execute 'alter table harmony_internal.phl_hr_adjustment_allocations set schema public';
  end if;
end
$move$;


do $move$
begin
  if to_regclass('harmony_internal.remed_claim_sequences') is not null and to_regclass('public.remed_claim_sequences') is not null then
    raise exception 'Rollback berhenti: harmony_internal.remed_claim_sequences dan public.remed_claim_sequences sama-sama ada.';
  elsif to_regclass('harmony_internal.remed_claim_sequences') is not null then
    execute 'alter table harmony_internal.remed_claim_sequences set schema public';
  end if;
end
$move$;


do $move$
begin
  if to_regclass('harmony_archive.phl_balances') is not null and to_regclass('public.phl_balances') is not null then
    raise exception 'Rollback berhenti: harmony_archive.phl_balances dan public.phl_balances sama-sama ada.';
  elsif to_regclass('harmony_archive.phl_balances') is not null then
    execute 'alter table harmony_archive.phl_balances set schema public';
  end if;
end
$move$;


do $move$
begin
  if to_regclass('harmony_archive.remed_legacy_imports') is not null and to_regclass('public.remed_legacy_imports') is not null then
    raise exception 'Rollback berhenti: harmony_archive.remed_legacy_imports dan public.remed_legacy_imports sama-sama ada.';
  elsif to_regclass('harmony_archive.remed_legacy_imports') is not null then
    execute 'alter table harmony_archive.remed_legacy_imports set schema public';
  end if;
end
$move$;


-- Restore original function definitions captured from live PRECHECK.

-- public.approve_phl_claim(p_claim_record_id uuid, p_approved_by text)
CREATE OR REPLACE FUNCTION public.approve_phl_claim(p_claim_record_id uuid, p_approved_by text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
  v_claim record;
  v_requested_days numeric;
  v_available_days numeric;
  v_remaining_to_use numeric;
  v_take_days numeric;
  v_balance record;
begin
  select *
  into v_claim
  from phl_records
  where id = p_claim_record_id
  for update;

  if not found then
    return 'Klaim PHL tidak ditemukan.';
  end if;

  if coalesce(v_claim.source, '') <> 'employee_phl_claim' then
    return 'Record ini bukan pengajuan Klaim PHL.';
  end if;

  if coalesce(v_claim.status, '') = 'approved' then
    return 'Klaim PHL ini sudah pernah disetujui HR.';
  end if;

  if coalesce(v_claim.status, '') = 'rejected' then
    return 'Klaim PHL ini sudah ditolak.';
  end if;

  v_requested_days := coalesce(v_claim.used_days, 0);

  if v_requested_days <= 0 then
    return 'Jumlah hari klaim PHL tidak valid.';
  end if;

  select coalesce(sum(remaining_days), 0)
  into v_available_days
  from phl_records
  where employee_id = v_claim.employee_id
    and status = 'approved'
    and source = 'attendance_phl_approved'
    and coalesce(remaining_days, 0) > 0
    and (
      expired_at is null
      or expired_at::date >= current_date
    );

  if v_available_days < v_requested_days then
    return 'Saldo PHL tidak mencukupi.';
  end if;

  v_remaining_to_use := v_requested_days;

  for v_balance in
    select *
    from phl_records
    where employee_id = v_claim.employee_id
      and status = 'approved'
      and source = 'attendance_phl_approved'
      and coalesce(remaining_days, 0) > 0
      and (
        expired_at is null
        or expired_at::date >= current_date
      )
    order by expired_at asc nulls last, phl_date asc nulls last, created_at asc
    for update
  loop
    exit when v_remaining_to_use <= 0;

    v_take_days := least(coalesce(v_balance.remaining_days, 0), v_remaining_to_use);

    update phl_records
    set
      used_days = coalesce(used_days, 0) + v_take_days,
      remaining_days = greatest(coalesce(remaining_days, 0) - v_take_days, 0),
      updated_at = now()
    where id = v_balance.id;

    insert into phl_claim_usages (
      claim_record_id,
      balance_record_id,
      used_days,
      created_at
    )
    values (
      p_claim_record_id,
      v_balance.id,
      v_take_days,
      now()
    )
    on conflict (claim_record_id, balance_record_id)
    do update set
      used_days = phl_claim_usages.used_days + excluded.used_days;

    v_remaining_to_use := v_remaining_to_use - v_take_days;
  end loop;

  update phl_records
  set
    status = 'approved',
    hr_status = 'approved',
    hr_approved_by = p_approved_by,
    hr_approved_at = now(),
    approved_by = p_approved_by,
    approved_at = now(),
    notes = coalesce(notes, '') || E'\nKlaim PHL disetujui HR dan saldo PHL sudah dikurangi otomatis.',
    updated_at = now()
  where id = p_claim_record_id;

  return 'Klaim PHL berhasil disetujui HR dan saldo PHL berhasil dikurangi.';
end;
$function$;


-- public.get_my_phl_balance_summary()
CREATE OR REPLACE FUNCTION public.get_my_phl_balance_summary()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_employee_id uuid;
  v_active_balance numeric(10, 2) := 0;
  v_active_ledger numeric(10, 2) := 0;
  v_legacy_balance numeric(10, 2) := 0;
  v_expiring_30_days numeric(10, 2) := 0;
  v_next_expiry date := null;
begin
  if auth.uid() is null then
    raise exception 'Sesi login tidak ditemukan. Silakan login ulang.';
  end if;

  select au.employee_id
  into v_employee_id
  from public.app_users au
  where au.id = auth.uid()
    and coalesce(au.is_active, true) = true
  limit 1;

  if v_employee_id is null then
    raise exception 'Akun belum terhubung ke data employee.';
  end if;

  select
    coalesce(
      sum(
        case
          when coalesce(pr.remaining_days, 0) > 0
            and (
              pr.expired_at is null
              or pr.expired_at >= current_date
            )
          then coalesce(pr.remaining_days, 0)
          else 0
        end
      ),
      0
    ),
    coalesce(
      sum(
        case
          when coalesce(pr.remaining_days, 0) > 0
            and pr.expired_at between current_date and current_date + 30
          then coalesce(pr.remaining_days, 0)
          else 0
        end
      ),
      0
    ),
    min(pr.expired_at) filter (
      where coalesce(pr.remaining_days, 0) > 0
        and pr.expired_at is not null
        and pr.expired_at >= current_date
    )
  into
    v_active_ledger,
    v_expiring_30_days,
    v_next_expiry
  from public.phl_records pr
  where pr.employee_id = v_employee_id
    and lower(coalesce(pr.source, '')) = 'attendance_phl_approved'
    and lower(coalesce(pr.status, '')) = 'approved';

  select coalesce(lb.remaining_days, 0)
  into v_legacy_balance
  from public.phl_employee_legacy_balances lb
  where lb.employee_id = v_employee_id;

  v_active_balance :=
    public.phl_sync_employee_effective_balance(v_employee_id);

  return jsonb_build_object(
    'success', true,
    'employee_id', v_employee_id,
    'total_available_days', v_active_balance,
    'active_ledger_balance', v_active_ledger,
    'legacy_balance', v_legacy_balance,
    'expiring_30_days', v_expiring_30_days,
    'next_expiry', v_next_expiry,
    'expiry_rule_days', 90
  );
end;
$function$;


-- public.harmony_reconcile_phl_credit_for_attendance(p_attendance_log_id uuid)
CREATE OR REPLACE FUNCTION public.harmony_reconcile_phl_credit_for_attendance(p_attendance_log_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_log public.attendance_logs%rowtype;
  v_employee public.employees%rowtype;
  v_existing public.phl_records%rowtype;
  v_existing_any public.phl_records%rowtype;
  v_other_log public.attendance_logs%rowtype;
  v_json jsonb;
  v_date date;
  v_eligible boolean := false;
  v_has_other_eligible boolean := false;
  v_balance_before numeric(10,2) := 0;
  v_balance_after numeric(10,2) := 0;
  v_effective_in text;
  v_effective_out text;
  v_actor_email text;
  v_supervisor_name text;
  v_phl_record_id uuid;
  v_used numeric(10,2) := 0;
  v_remaining numeric(10,2) := 0;
begin
  select *
  into v_log
  from public.attendance_logs al
  where al.id = p_attendance_log_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', true,
      'action', 'attendance_not_found',
      'attendance_log_id', p_attendance_log_id
    );
  end if;

  v_json := to_jsonb(v_log);

  begin
    v_date := nullif(v_json ->> 'attendance_date', '')::date;
  exception when others then
    v_date := null;
  end;

  if v_log.employee_id is null or v_date is null then
    return jsonb_build_object(
      'success', true,
      'action', 'skipped_missing_identity_or_date',
      'attendance_log_id', p_attendance_log_id
    );
  end if;

  select *
  into v_employee
  from public.employees e
  where e.id = v_log.employee_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', true,
      'action', 'employee_not_found',
      'attendance_log_id', p_attendance_log_id,
      'employee_id', v_log.employee_id
    );
  end if;

  v_balance_before := public.phl_get_effective_balance(v_employee.id);
  v_eligible := public.harmony_attendance_is_phl_eligible(v_log);

  v_effective_in := coalesce(
    nullif(btrim(coalesce(v_json ->> 'manual_check_in', '')), ''),
    nullif(btrim(coalesce(v_json ->> 'requested_check_in', '')), ''),
    nullif(btrim(coalesce(v_json ->> 'check_in', '')), '')
  );

  v_effective_out := coalesce(
    nullif(btrim(coalesce(v_json ->> 'manual_check_out', '')), ''),
    nullif(btrim(coalesce(v_json ->> 'requested_check_out', '')), ''),
    nullif(btrim(coalesce(v_json ->> 'check_out', '')), '')
  );

  v_actor_email := coalesce(
    nullif(lower(btrim(coalesce(auth.jwt() ->> 'email', ''))), ''),
    nullif(btrim(coalesce(v_json ->> 'supervisor_approved_by', '')), ''),
    'harmony-system'
  );

  v_supervisor_name := coalesce(
    nullif(btrim(coalesce(v_json ->> 'supervisor_approved_by', '')), ''),
    nullif(btrim(coalesce(v_json ->> 'supervisor_reviewed_by', '')), ''),
    v_actor_email,
    'Supervisor'
  );

  -- Auto record existing, baik terhubung id log maupun berasal dari tanggal sama.
  select pr.*
  into v_existing
  from public.phl_records pr
  where coalesce(pr.attendance_credit_auto, false) = true
    and (
      pr.attendance_log_id = v_log.id
      or (
        pr.employee_id = v_employee.id
        and pr.phl_date = v_date
      )
    )
  order by
    case when pr.attendance_log_id = v_log.id then 0 else 1 end,
    pr.created_at asc
  limit 1
  for update;

  if v_eligible then
    -- Entitlement manual/approved pada tanggal sama dianggap sudah mewakili hak PHL.
    if not found then
      select pr.*
      into v_existing_any
      from public.phl_records pr
      where pr.phl_date = v_date
        and (
          pr.employee_id = v_employee.id
          or (
            v_employee.machine_pin is not null
            and pr.machine_pin = v_employee.machine_pin
          )
        )
      order by
        case when lower(coalesce(pr.source, '')) = 'attendance_phl_approved' then 0 else 1 end,
        pr.created_at asc
      limit 1
      for update;

      if found then
        if lower(coalesce(v_existing_any.source, '')) = 'employee_phl_claim' then
          raise exception
            'Tanggal % sudah memiliki record klaim PHL employee. Auto-credit dari absensi diblokir agar record klaim tidak diubah/ditimpa.',
            v_date;
        end if;

        if lower(coalesce(v_existing_any.source, '')) = 'attendance_phl_approved'
           and lower(coalesce(v_existing_any.status, '')) = 'approved' then
          -- Saldo sudah tersedia dari proses manual HR/legacy. Jangan double credit.
          v_balance_after := public.phl_sync_employee_effective_balance(v_employee.id);
          return jsonb_build_object(
            'success', true,
            'action', 'existing_credit_preserved',
            'attendance_log_id', v_log.id,
            'employee_id', v_employee.id,
            'attendance_date', v_date,
            'phl_record_id', v_existing_any.id,
            'balance_before', v_balance_before,
            'balance_after', v_balance_after
          );
        end if;

        -- Kandidat/record non-claim tanggal sama dikonversi menjadi entitlement auto.
        update public.phl_records
        set
          employee_id = v_employee.id,
          employee_number = v_employee.employee_number,
          machine_pin = v_employee.machine_pin,
          full_name = v_employee.full_name,
          department = v_employee.department,
          "position" = v_employee."position",
          attendance_log_id = v_log.id,
          check_in = v_effective_in,
          check_out = v_effective_out,
          source = 'attendance_phl_approved',
          status = 'approved',
          reason = 'Auto PHL: kerja hari libur disetujui atasan.',
          balance_days = 1,
          used_days = 0,
          remaining_days = 1,
          valid_from = v_date,
          expired_at = v_date + 90,
          notes = concat_ws(
            E'\n',
            nullif(notes, ''),
            '[' || to_char(now(), 'DD/MM/YYYY HH24:MI') || '] Auto-credit PHL +1 dari kerja hari libur setelah approval atasan.'
          ),
          approved_by = v_supervisor_name,
          approved_at = coalesce(v_log.supervisor_approved_at, now()),
          hr_status = 'approved',
          hr_approved_by = 'AUTO / Supervisor Approval',
          hr_approved_at = coalesce(v_log.supervisor_approved_at, now()),
          attendance_credit_auto = true,
          attendance_credit_reversed_at = null,
          attendance_credit_reversed_by = null,
          attendance_credit_note = 'Generated from approved holiday/weekend attendance.',
          updated_at = now()
        where id = v_existing_any.id
        returning id into v_phl_record_id;
      else
        insert into public.phl_records (
          employee_id,
          employee_number,
          machine_pin,
          full_name,
          department,
          "position",
          phl_date,
          attendance_log_id,
          check_in,
          check_out,
          source,
          status,
          reason,
          balance_days,
          used_days,
          remaining_days,
          valid_from,
          expired_at,
          notes,
          approved_by,
          approved_at,
          hr_status,
          hr_approved_by,
          hr_approved_at,
          attendance_credit_auto,
          attendance_credit_note,
          created_at,
          updated_at
        )
        values (
          v_employee.id,
          v_employee.employee_number,
          v_employee.machine_pin,
          v_employee.full_name,
          v_employee.department,
          v_employee."position",
          v_date,
          v_log.id,
          v_effective_in,
          v_effective_out,
          'attendance_phl_approved',
          'approved',
          'Auto PHL: kerja hari libur disetujui atasan.',
          1,
          0,
          1,
          v_date,
          v_date + 90,
          '[' || to_char(now(), 'DD/MM/YYYY HH24:MI') || '] Auto-credit PHL +1 dari kerja hari libur setelah approval atasan.',
          v_supervisor_name,
          coalesce(v_log.supervisor_approved_at, now()),
          'approved',
          'AUTO / Supervisor Approval',
          coalesce(v_log.supervisor_approved_at, now()),
          true,
          'Generated from approved holiday/weekend attendance.',
          now(),
          now()
        )
        returning id into v_phl_record_id;
      end if;

      v_balance_after := public.phl_sync_employee_effective_balance(v_employee.id);

      insert into public.phl_attendance_credit_audit_logs (
        attendance_log_id,
        phl_record_id,
        employee_id,
        attendance_date,
        action,
        balance_before,
        balance_after,
        actor_user_id,
        actor_email,
        note,
        metadata
      )
      values (
        v_log.id,
        v_phl_record_id,
        v_employee.id,
        v_date,
        'credited',
        v_balance_before,
        v_balance_after,
        auth.uid(),
        v_actor_email,
        'PHL +1 otomatis dari kerja Sabtu/Minggu/hari libur setelah approval periode oleh atasan.',
        jsonb_build_object(
          'check_in', v_effective_in,
          'check_out', v_effective_out,
          'supervisor_status', v_json ->> 'supervisor_approval_status',
          'expiry_days', 90,
          'idempotent', true
        )
      );

      return jsonb_build_object(
        'success', true,
        'action', 'credited',
        'attendance_log_id', v_log.id,
        'employee_id', v_employee.id,
        'attendance_date', v_date,
        'phl_record_id', v_phl_record_id,
        'balance_before', v_balance_before,
        'balance_after', v_balance_after
      );
    end if;

    -- Existing auto entitlement: restore bila sebelumnya direverse, otherwise no-op.
    if lower(coalesce(v_existing.status, '')) <> 'approved' then
      if coalesce(v_existing.used_days, 0) > 0 then
        raise exception
          'Entitlement PHL tanggal % pernah digunakan. Restore otomatis diblokir; review klaim PHL terkait terlebih dahulu.',
          v_date;
      end if;

      update public.phl_records
      set
        attendance_log_id = v_log.id,
        check_in = v_effective_in,
        check_out = v_effective_out,
        status = 'approved',
        balance_days = 1,
        used_days = 0,
        remaining_days = 1,
        valid_from = v_date,
        expired_at = v_date + 90,
        reason = 'Auto PHL: kerja hari libur disetujui atasan.',
        approved_by = v_supervisor_name,
        approved_at = coalesce(v_log.supervisor_approved_at, now()),
        hr_status = 'approved',
        hr_approved_by = 'AUTO / Supervisor Approval',
        hr_approved_at = coalesce(v_log.supervisor_approved_at, now()),
        attendance_credit_reversed_at = null,
        attendance_credit_reversed_by = null,
        attendance_credit_note = 'Restored after attendance approval became valid again.',
        updated_at = now()
      where id = v_existing.id;

      v_balance_after := public.phl_sync_employee_effective_balance(v_employee.id);

      insert into public.phl_attendance_credit_audit_logs (
        attendance_log_id, phl_record_id, employee_id, attendance_date,
        action, balance_before, balance_after, actor_user_id, actor_email, note, metadata
      ) values (
        v_log.id, v_existing.id, v_employee.id, v_date,
        'restored', v_balance_before, v_balance_after, auth.uid(), v_actor_email,
        'Entitlement PHL dipulihkan karena approval kerja hari libur kembali valid.',
        jsonb_build_object('idempotent', true)
      );

      return jsonb_build_object(
        'success', true,
        'action', 'restored',
        'phl_record_id', v_existing.id,
        'balance_before', v_balance_before,
        'balance_after', v_balance_after
      );
    end if;

    -- Sudah approved: hanya refresh link/evidence, TANPA +1 lagi.
    update public.phl_records
    set
      attendance_log_id = v_log.id,
      check_in = coalesce(v_effective_in, check_in),
      check_out = coalesce(v_effective_out, check_out),
      updated_at = now()
    where id = v_existing.id;

    v_balance_after := public.phl_sync_employee_effective_balance(v_employee.id);

    return jsonb_build_object(
      'success', true,
      'action', 'already_credited',
      'attendance_log_id', v_log.id,
      'employee_id', v_employee.id,
      'attendance_date', v_date,
      'phl_record_id', v_existing.id,
      'balance_before', v_balance_before,
      'balance_after', v_balance_after
    );
  end if;

  -- ------------------------------------------------------------------------
  -- Tidak eligible. Reverse HANYA auto entitlement, jangan sentuh saldo HR manual.
  -- ------------------------------------------------------------------------
  if found then
    -- Bila ada log lain pada employee+tanggal yang masih eligible, pindahkan link
    -- entitlement ke log tersebut dan jangan reverse.
    select al.*
    into v_other_log
    from public.attendance_logs al
    where al.employee_id = v_employee.id
      and al.id <> v_log.id
      and al.attendance_date::date = v_date
      and public.harmony_attendance_is_phl_eligible(al)
    order by al.created_at asc nulls last, al.id
    limit 1;

    v_has_other_eligible := found;

    if v_has_other_eligible then
      update public.phl_records
      set
        attendance_log_id = v_other_log.id,
        updated_at = now()
      where id = v_existing.id;

      v_balance_after := public.phl_sync_employee_effective_balance(v_employee.id);

      return jsonb_build_object(
        'success', true,
        'action', 'preserved_by_other_eligible_log',
        'phl_record_id', v_existing.id,
        'attendance_log_id', v_other_log.id,
        'balance_before', v_balance_before,
        'balance_after', v_balance_after
      );
    end if;

    if lower(coalesce(v_existing.status, '')) = 'approved' then
      v_used := coalesce(v_existing.used_days, 0);
      v_remaining := coalesce(v_existing.remaining_days, 0);

      -- Auto credit = 1 hari. Jika sudah teralokasi/terpakai, jangan hapus sumbernya.
      if v_used > 0.0001 or v_remaining < 0.9999 then
        raise exception
          'PHL dari kerja hari libur tanggal % sudah digunakan (used: %, remaining: %). Batalkan/reversal klaim PHL terkait terlebih dahulu sebelum reject/mengubah approval absensi.',
          v_date,
          v_used,
          v_remaining;
      end if;

      update public.phl_records
      set
        status = 'cancelled',
        remaining_days = 0,
        attendance_credit_reversed_at = now(),
        attendance_credit_reversed_by = v_actor_email,
        attendance_credit_note = 'Auto-reversed because attendance/supervisor period is no longer eligible.',
        notes = concat_ws(
          E'\n',
          nullif(notes, ''),
          '[' || to_char(now(), 'DD/MM/YYYY HH24:MI') || '] Auto-reversal PHL -1 karena approval/kriteria kerja hari libur tidak lagi valid.'
        ),
        updated_at = now()
      where id = v_existing.id;

      v_balance_after := public.phl_sync_employee_effective_balance(v_employee.id);

      insert into public.phl_attendance_credit_audit_logs (
        attendance_log_id, phl_record_id, employee_id, attendance_date,
        action, balance_before, balance_after, actor_user_id, actor_email, note, metadata
      ) values (
        v_log.id, v_existing.id, v_employee.id, v_date,
        'reversed', v_balance_before, v_balance_after, auth.uid(), v_actor_email,
        'PHL -1 otomatis karena approval/kriteria kerja hari libur tidak lagi valid.',
        jsonb_build_object(
          'used_days', v_used,
          'remaining_days_before', v_remaining,
          'reversal_safe', true
        )
      );

      return jsonb_build_object(
        'success', true,
        'action', 'reversed',
        'phl_record_id', v_existing.id,
        'balance_before', v_balance_before,
        'balance_after', v_balance_after
      );
    end if;
  end if;

  v_balance_after := public.phl_sync_employee_effective_balance(v_employee.id);

  return jsonb_build_object(
    'success', true,
    'action', 'not_eligible_no_credit',
    'attendance_log_id', v_log.id,
    'employee_id', v_employee.id,
    'attendance_date', v_date,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after
  );
end;
$function$;


-- public.hr_adjust_employee_phl_balance(p_request_key uuid, p_employee_id uuid, p_action text, p_days numeric, p_phl_date date, p_reason text, p_actor_email text)
CREATE OR REPLACE FUNCTION public.hr_adjust_employee_phl_balance(p_request_key uuid, p_employee_id uuid, p_action text, p_days numeric, p_phl_date date DEFAULT NULL::date, p_reason text DEFAULT NULL::text, p_actor_email text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_employee public.employees%rowtype;
  v_existing_adjustment public.phl_hr_adjustments%rowtype;
  v_existing_record public.phl_records%rowtype;
  v_source public.phl_records%rowtype;

  v_actor_role text;
  v_actor_email text;
  v_action text;
  v_reason text;
  v_expired_at date;
  v_adjustment_id uuid := gen_random_uuid();
  v_source_record_id uuid := null;

  v_balance_before numeric(10, 2) := 0;
  v_balance_after numeric(10, 2) := 0;
  v_ledger_before numeric(10, 2) := 0;
  v_ledger_after numeric(10, 2) := 0;
  v_legacy_before numeric(10, 2) := 0;
  v_legacy_after numeric(10, 2) := 0;

  v_remaining_to_subtract numeric(10, 2) := 0;
  v_take numeric(10, 2) := 0;
  v_next_remaining numeric(10, 2) := 0;
  v_next_used numeric(10, 2) := 0;
  v_machine_pin_match text;
begin
  if auth.uid() is null then
    raise exception 'Sesi login tidak ditemukan. Silakan login ulang.';
  end if;

  if p_request_key is null then
    raise exception 'Request key penyesuaian PHL tidak tersedia.';
  end if;

  select *
  into v_existing_adjustment
  from public.phl_hr_adjustments
  where request_key = p_request_key
  limit 1;

  if found then
    return jsonb_build_object(
      'success', true,
      'duplicate_request', true,
      'adjustment_id', v_existing_adjustment.id,
      'employee_id', v_existing_adjustment.employee_id,
      'action', v_existing_adjustment.action,
      'days', v_existing_adjustment.days,
      'phl_date', v_existing_adjustment.phl_date,
      'expired_at', v_existing_adjustment.expired_at,
      'balance_before', v_existing_adjustment.balance_before,
      'balance_after', v_existing_adjustment.balance_after,
      'message', 'Request ini sebelumnya sudah berhasil diproses. Saldo tidak diubah ulang.'
    );
  end if;

  select
    lower(coalesce(au.role, '')),
    lower(coalesce(au.email, ''))
  into
    v_actor_role,
    v_actor_email
  from public.app_users au
  where au.id = auth.uid()
    and coalesce(au.is_active, true) = true
  limit 1;

  if not (
    coalesce(v_actor_role, '') like '%hr%'
    or coalesce(v_actor_role, '') like '%admin%'
  ) then
    raise exception 'Hanya akun HR/Admin aktif yang dapat menyesuaikan saldo PHL.';
  end if;

  v_actor_email := coalesce(
    nullif(btrim(coalesce(p_actor_email, '')), ''),
    nullif(v_actor_email, ''),
    'HR Administrator'
  );

  v_action := lower(btrim(coalesce(p_action, '')));
  v_reason := btrim(coalesce(p_reason, ''));

  if v_action not in ('add', 'subtract') then
    raise exception 'Aksi saldo PHL hanya boleh add atau subtract.';
  end if;

  if coalesce(p_days, 0) <= 0 then
    raise exception 'Jumlah penyesuaian PHL harus lebih dari 0 hari.';
  end if;

  if length(v_reason) < 5 then
    raise exception 'Alasan penyesuaian PHL minimal 5 karakter.';
  end if;

  if v_action = 'add' then
    if p_phl_date is null then
      raise exception 'Tanggal pelaksanaan PHL wajib diisi untuk penambahan saldo.';
    end if;

    if p_phl_date > current_date then
      raise exception 'Tanggal pelaksanaan PHL tidak boleh melebihi hari ini.';
    end if;

    v_expired_at := p_phl_date + 90;
  end if;

  select *
  into v_employee
  from public.employees
  where id = p_employee_id
  for update;

  if not found then
    raise exception 'Data karyawan tidak ditemukan.';
  end if;

  insert into public.phl_employee_legacy_balances (
    employee_id,
    initial_days,
    remaining_days,
    captured_employee_balance,
    captured_active_ledger,
    captured_at,
    updated_at
  )
  values (
    v_employee.id,
    0,
    0,
    0,
    0,
    now(),
    now()
  )
  on conflict (employee_id) do nothing;

  select coalesce(sum(coalesce(pr.remaining_days, 0)), 0)
  into v_ledger_before
  from public.phl_records pr
  where pr.employee_id = v_employee.id
    and lower(coalesce(pr.source, '')) = 'attendance_phl_approved'
    and lower(coalesce(pr.status, '')) = 'approved'
    and coalesce(pr.remaining_days, 0) > 0
    and (
      pr.expired_at is null
      or pr.expired_at >= current_date
    );

  select coalesce(lb.remaining_days, 0)
  into v_legacy_before
  from public.phl_employee_legacy_balances lb
  where lb.employee_id = v_employee.id
  for update;

  v_balance_before := v_ledger_before + v_legacy_before;

  if v_action = 'add' then
    -- Satu employee/tanggal diperlakukan sebagai satu lot PHL.
    -- Jika sudah ada saldo approved pada tanggal yang sama, jumlah
    -- penambahan ditambahkan ke lot tersebut.
    select pr.*
    into v_existing_record
    from public.phl_records pr
    where pr.phl_date = p_phl_date
      and (
        pr.employee_id = v_employee.id
        or (
          v_employee.machine_pin is not null
          and pr.machine_pin = v_employee.machine_pin
        )
      )
    order by
      case
        when lower(coalesce(pr.source, '')) = 'attendance_phl_approved'
          and lower(coalesce(pr.status, '')) = 'approved'
        then 1
        when lower(coalesce(pr.source, '')) <> 'employee_phl_claim'
        then 2
        else 3
      end,
      pr.created_at
    limit 1
    for update;

    if found and lower(coalesce(v_existing_record.source, '')) = 'employee_phl_claim' then
      raise exception
        'Tanggal % sudah dipakai oleh record klaim PHL. Penambahan dibatalkan agar ledger tidak bentrok.',
        p_phl_date;
    end if;

    if found
       and lower(coalesce(v_existing_record.source, '')) = 'attendance_phl_approved'
       and lower(coalesce(v_existing_record.status, '')) = 'approved' then

      update public.phl_records
      set
        balance_days = coalesce(balance_days, 0) + p_days,
        remaining_days = coalesce(remaining_days, 0) + p_days,
        expired_at = v_expired_at,
        valid_from = p_phl_date,
        reason = concat_ws(
          ' | ',
          nullif(reason, ''),
          'Penambahan saldo PHL oleh HR: ' || v_reason
        ),
        notes = concat_ws(
          E'\n',
          nullif(notes, ''),
          '[' || to_char(now(), 'DD/MM/YYYY HH24:MI') || '] HR menambahkan '
            || p_days || ' hari. Alasan: ' || v_reason
        ),
        approved_by = v_actor_email,
        approved_at = coalesce(approved_at, now()),
        hr_status = 'approved',
        hr_approved_by = v_actor_email,
        hr_approved_at = now(),
        updated_at = now()
      where id = v_existing_record.id;

      v_source_record_id := v_existing_record.id;

    elsif found then
      -- Kandidat/pengajuan saldo pada tanggal yang sama disahkan menjadi
      -- lot approved dengan jumlah final sesuai input HR.
      update public.phl_records
      set
        employee_id = v_employee.id,
        employee_number = v_employee.employee_number,
        machine_pin = v_employee.machine_pin,
        full_name = v_employee.full_name,
        department = v_employee.department,
        "position" = v_employee."position",
        source = 'attendance_phl_approved',
        status = 'approved',
        reason = 'Penambahan saldo PHL oleh HR: ' || v_reason,
        balance_days = p_days,
        used_days = 0,
        remaining_days = p_days,
        valid_from = p_phl_date,
        expired_at = v_expired_at,
        notes = concat_ws(
          E'\n',
          nullif(notes, ''),
          '[' || to_char(now(), 'DD/MM/YYYY HH24:MI') || '] Disahkan HR sebagai saldo PHL '
            || p_days || ' hari. Alasan: ' || v_reason
        ),
        approved_by = v_actor_email,
        approved_at = now(),
        hr_status = 'approved',
        hr_approved_by = v_actor_email,
        hr_approved_at = now(),
        updated_at = now()
      where id = v_existing_record.id;

      v_source_record_id := v_existing_record.id;

    else
      insert into public.phl_records (
        employee_id,
        employee_number,
        machine_pin,
        full_name,
        department,
        "position",
        phl_date,
        source,
        status,
        reason,
        balance_days,
        used_days,
        remaining_days,
        valid_from,
        expired_at,
        notes,
        approved_by,
        approved_at,
        hr_status,
        hr_approved_by,
        hr_approved_at,
        created_at,
        updated_at
      )
      values (
        v_employee.id,
        v_employee.employee_number,
        v_employee.machine_pin,
        v_employee.full_name,
        v_employee.department,
        v_employee."position",
        p_phl_date,
        'attendance_phl_approved',
        'approved',
        'Penambahan saldo PHL oleh HR: ' || v_reason,
        p_days,
        0,
        p_days,
        p_phl_date,
        v_expired_at,
        '[' || to_char(now(), 'DD/MM/YYYY HH24:MI') || '] Saldo PHL ditambahkan HR. Alasan: ' || v_reason,
        v_actor_email,
        now(),
        'approved',
        v_actor_email,
        now(),
        now(),
        now()
      )
      returning id into v_source_record_id;
    end if;

  else
    if p_days > v_balance_before + 0.0001 then
      raise exception
        'Saldo PHL aktif hanya % hari. Pengurangan % hari tidak dapat diproses.',
        v_balance_before,
        p_days;
    end if;

    v_remaining_to_subtract := p_days;

    -- Pengurangan mengambil saldo yang paling cepat expired terlebih dahulu.
    for v_source in
      select pr.*
      from public.phl_records pr
      where pr.employee_id = v_employee.id
        and lower(coalesce(pr.source, '')) = 'attendance_phl_approved'
        and lower(coalesce(pr.status, '')) = 'approved'
        and coalesce(pr.remaining_days, 0) > 0
        and (
          pr.expired_at is null
          or pr.expired_at >= current_date
        )
      order by
        pr.expired_at asc nulls last,
        pr.valid_from asc nulls last,
        pr.created_at asc nulls last,
        pr.id
      for update
    loop
      exit when v_remaining_to_subtract <= 0;

      v_take := least(
        coalesce(v_source.remaining_days, 0),
        v_remaining_to_subtract
      );

      if v_take <= 0 then
        continue;
      end if;

      v_next_remaining :=
        coalesce(v_source.remaining_days, 0) - v_take;

      v_next_used :=
        coalesce(v_source.used_days, 0) + v_take;

      update public.phl_records
      set
        used_days = v_next_used,
        remaining_days = v_next_remaining,
        notes = concat_ws(
          E'\n',
          nullif(notes, ''),
          '[' || to_char(now(), 'DD/MM/YYYY HH24:MI') || '] HR mengurangi '
            || v_take || ' hari. Alasan: ' || v_reason
        ),
        updated_at = now()
      where id = v_source.id;

      insert into public.phl_hr_adjustment_allocations (
        adjustment_id,
        employee_id,
        allocation_type,
        source_record_id,
        allocated_days,
        remaining_before,
        remaining_after,
        used_before,
        used_after,
        source_expired_at,
        created_at
      )
      values (
        v_adjustment_id,
        v_employee.id,
        'phl_record',
        v_source.id,
        v_take,
        coalesce(v_source.remaining_days, 0),
        v_next_remaining,
        coalesce(v_source.used_days, 0),
        v_next_used,
        v_source.expired_at,
        now()
      );

      v_remaining_to_subtract :=
        v_remaining_to_subtract - v_take;
    end loop;

    if v_remaining_to_subtract > 0 then
      select coalesce(lb.remaining_days, 0)
      into v_legacy_after
      from public.phl_employee_legacy_balances lb
      where lb.employee_id = v_employee.id
      for update;

      if v_remaining_to_subtract > v_legacy_after + 0.0001 then
        raise exception
          'Saldo ledger dan legacy tidak cukup untuk pengurangan PHL.';
      end if;

      update public.phl_employee_legacy_balances
      set
        remaining_days = remaining_days - v_remaining_to_subtract,
        updated_at = now()
      where employee_id = v_employee.id;

      insert into public.phl_hr_adjustment_allocations (
        adjustment_id,
        employee_id,
        allocation_type,
        source_record_id,
        allocated_days,
        remaining_before,
        remaining_after,
        used_before,
        used_after,
        source_expired_at,
        created_at
      )
      values (
        v_adjustment_id,
        v_employee.id,
        'legacy_balance',
        null,
        v_remaining_to_subtract,
        v_legacy_after,
        v_legacy_after - v_remaining_to_subtract,
        null,
        null,
        null,
        now()
      );

      v_remaining_to_subtract := 0;
    end if;
  end if;

  select coalesce(sum(coalesce(pr.remaining_days, 0)), 0)
  into v_ledger_after
  from public.phl_records pr
  where pr.employee_id = v_employee.id
    and lower(coalesce(pr.source, '')) = 'attendance_phl_approved'
    and lower(coalesce(pr.status, '')) = 'approved'
    and coalesce(pr.remaining_days, 0) > 0
    and (
      pr.expired_at is null
      or pr.expired_at >= current_date
    );

  select coalesce(lb.remaining_days, 0)
  into v_legacy_after
  from public.phl_employee_legacy_balances lb
  where lb.employee_id = v_employee.id;

  v_balance_after :=
    public.phl_sync_employee_effective_balance(v_employee.id);

  insert into public.phl_hr_adjustments (
    id,
    request_key,
    employee_id,
    employee_number,
    full_name,
    action,
    days,
    phl_date,
    expired_at,
    source_record_id,
    balance_before,
    balance_after,
    active_ledger_before,
    active_ledger_after,
    legacy_before,
    legacy_after,
    reason,
    actor_user_id,
    actor_email,
    metadata,
    created_at
  )
  values (
    v_adjustment_id,
    p_request_key,
    v_employee.id,
    v_employee.employee_number,
    v_employee.full_name,
    v_action,
    p_days,
    case when v_action = 'add' then p_phl_date else null end,
    case when v_action = 'add' then v_expired_at else null end,
    v_source_record_id,
    v_balance_before,
    v_balance_after,
    v_ledger_before,
    v_ledger_after,
    v_legacy_before,
    v_legacy_after,
    v_reason,
    auth.uid(),
    v_actor_email,
    jsonb_build_object(
      'expiry_days', 90,
      'subtraction_method', case
        when v_action = 'subtract' then 'earliest_expiry_first'
        else null
      end,
      'source', 'hr_employee_edit'
    ),
    now()
  );

  return jsonb_build_object(
    'success', true,
    'duplicate_request', false,
    'adjustment_id', v_adjustment_id,
    'employee_id', v_employee.id,
    'action', v_action,
    'days', p_days,
    'phl_date', case when v_action = 'add' then p_phl_date else null end,
    'expired_at', case when v_action = 'add' then v_expired_at else null end,
    'source_record_id', v_source_record_id,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'active_ledger_before', v_ledger_before,
    'active_ledger_after', v_ledger_after,
    'legacy_before', v_legacy_before,
    'legacy_after', v_legacy_after,
    'message', case
      when v_action = 'add'
        then 'Saldo PHL berhasil ditambahkan dan akan expired 90 hari setelah tanggal pelaksanaan.'
      else 'Saldo PHL berhasil dikurangi dari saldo yang paling cepat expired.'
    end
  );
end;
$function$;


-- public.hr_adjust_employee_phl_balance_v2(p_request_key uuid, p_employee_id uuid, p_action text, p_days numeric, p_phl_date date, p_description text, p_reason text, p_actor_email text)
CREATE OR REPLACE FUNCTION public.hr_adjust_employee_phl_balance_v2(p_request_key uuid, p_employee_id uuid, p_action text, p_days numeric, p_phl_date date DEFAULT NULL::date, p_description text DEFAULT NULL::text, p_reason text DEFAULT NULL::text, p_actor_email text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_employee public.employees%rowtype;
  v_existing_adjustment public.phl_hr_adjustments%rowtype;
  v_existing_record public.phl_records%rowtype;
  v_source public.phl_records%rowtype;

  v_action text;
  v_description text;
  v_reason text;
  v_actor_email text;
  v_expired_at date := null;
  v_adjustment_id uuid := gen_random_uuid();
  v_source_record_id uuid := null;

  v_balance_before numeric(10,2) := 0;
  v_balance_after numeric(10,2) := 0;
  v_ledger_before numeric(10,2) := 0;
  v_ledger_after numeric(10,2) := 0;
  v_legacy_before numeric(10,2) := 0;
  v_legacy_after numeric(10,2) := 0;

  v_remaining numeric(10,2) := 0;
  v_take numeric(10,2) := 0;
  v_next_remaining numeric(10,2) := 0;
  v_next_used numeric(10,2) := 0;
begin
  if auth.uid() is null then
    raise exception 'Sesi login tidak ditemukan. Silakan login ulang.';
  end if;

  if not public.harmony_is_active_hr_admin() then
    raise exception 'Hanya akun HR/Admin aktif yang dapat menyesuaikan saldo PHL.';
  end if;

  if p_request_key is null then
    raise exception 'Request key tidak tersedia.';
  end if;

  select *
  into v_existing_adjustment
  from public.phl_hr_adjustments
  where request_key = p_request_key
  limit 1;

  if found then
    return jsonb_build_object(
      'success', true,
      'duplicate_request', true,
      'adjustment_id', v_existing_adjustment.id,
      'balance_before', v_existing_adjustment.balance_before,
      'balance_after', v_existing_adjustment.balance_after,
      'description', v_existing_adjustment.description,
      'message', 'Request sebelumnya sudah berhasil diproses.'
    );
  end if;

  v_action := lower(btrim(coalesce(p_action, '')));
  v_description := btrim(coalesce(p_description, ''));
  v_reason := btrim(coalesce(p_reason, ''));
  v_actor_email := coalesce(
    nullif(btrim(coalesce(p_actor_email, '')), ''),
    nullif(lower(coalesce(auth.jwt() ->> 'email', '')), ''),
    'HR Administrator'
  );

  if v_action not in ('add', 'subtract') then
    raise exception 'Aksi hanya boleh add atau subtract.';
  end if;

  if coalesce(p_days, 0) <= 0 then
    raise exception 'Jumlah PHL harus lebih dari 0 hari.';
  end if;

  if length(v_reason) < 5 then
    raise exception 'Alasan penyesuaian HR minimal 5 karakter.';
  end if;

  if v_action = 'add' then
    if length(v_description) < 3 then
      raise exception 'Keterangan saldo PHL minimal 3 karakter.';
    end if;

    if p_phl_date is null then
      raise exception 'Tanggal PHL dilaksanakan wajib diisi.';
    end if;

    if p_phl_date > current_date then
      raise exception 'Tanggal PHL tidak boleh melebihi hari ini.';
    end if;

    v_expired_at := p_phl_date + 90;
  else
    if v_description = '' then
      v_description := 'Pengurangan saldo PHL oleh HR';
    end if;
  end if;

  select *
  into v_employee
  from public.employees
  where id = p_employee_id
  for update;

  if not found then
    raise exception 'Data karyawan tidak ditemukan.';
  end if;

  insert into public.phl_employee_legacy_balances (
    employee_id,
    initial_days,
    remaining_days,
    captured_employee_balance,
    captured_active_ledger,
    captured_at,
    updated_at
  )
  values (v_employee.id, 0, 0, 0, 0, now(), now())
  on conflict (employee_id) do nothing;

  select coalesce(sum(coalesce(pr.remaining_days, 0)), 0)
  into v_ledger_before
  from public.phl_records pr
  where pr.employee_id = v_employee.id
    and lower(coalesce(pr.source, '')) = 'attendance_phl_approved'
    and lower(coalesce(pr.status, '')) = 'approved'
    and coalesce(pr.remaining_days, 0) > 0
    and (pr.expired_at is null or pr.expired_at >= current_date);

  select coalesce(lb.remaining_days, 0)
  into v_legacy_before
  from public.phl_employee_legacy_balances lb
  where lb.employee_id = v_employee.id
  for update;

  v_balance_before := v_ledger_before + v_legacy_before;

  -- Buat audit header lebih dulu agar allocation FK selalu valid.
  insert into public.phl_hr_adjustments (
    id,
    request_key,
    employee_id,
    employee_number,
    full_name,
    action,
    days,
    phl_date,
    expired_at,
    source_record_id,
    balance_before,
    balance_after,
    active_ledger_before,
    active_ledger_after,
    legacy_before,
    legacy_after,
    description,
    reason,
    actor_user_id,
    actor_email,
    metadata,
    created_at
  )
  values (
    v_adjustment_id,
    p_request_key,
    v_employee.id,
    v_employee.employee_number,
    v_employee.full_name,
    v_action,
    p_days,
    case when v_action = 'add' then p_phl_date else null end,
    case when v_action = 'add' then v_expired_at else null end,
    null,
    v_balance_before,
    v_balance_before,
    v_ledger_before,
    v_ledger_before,
    v_legacy_before,
    v_legacy_before,
    v_description,
    v_reason,
    auth.uid(),
    v_actor_email,
    jsonb_build_object(
      'version', 'V5',
      'expiry_days', 90,
      'source', 'hr_employee_edit',
      'subtraction_method', case
        when v_action = 'subtract' then 'earliest_expiry_first'
        else null
      end
    ),
    now()
  );

  if v_action = 'add' then
    -- Pertahankan kompatibilitas bila struktur lama memakai 1 lot per tanggal.
    select pr.*
    into v_existing_record
    from public.phl_records pr
    where pr.phl_date = p_phl_date
      and (
        pr.employee_id = v_employee.id
        or (
          v_employee.machine_pin is not null
          and pr.machine_pin = v_employee.machine_pin
        )
      )
    order by
      case
        when lower(coalesce(pr.source, '')) = 'attendance_phl_approved'
          and lower(coalesce(pr.status, '')) = 'approved'
        then 1
        when lower(coalesce(pr.source, '')) <> 'employee_phl_claim'
        then 2
        else 3
      end,
      pr.created_at
    limit 1
    for update;

    if found
       and lower(coalesce(v_existing_record.source, '')) = 'employee_phl_claim' then
      raise exception
        'Tanggal % sudah dipakai oleh klaim PHL employee. Penambahan HR dibatalkan agar ledger tidak bentrok.',
        p_phl_date;
    end if;

    if found
       and lower(coalesce(v_existing_record.source, '')) = 'attendance_phl_approved'
       and lower(coalesce(v_existing_record.status, '')) = 'approved' then

      update public.phl_records
      set
        balance_days = coalesce(balance_days, 0) + p_days,
        remaining_days = coalesce(remaining_days, 0) + p_days,
        valid_from = p_phl_date,
        expired_at = v_expired_at,
        reason = concat_ws(
          ' | ',
          nullif(reason, ''),
          nullif(v_description, '')
        ),
        notes = concat_ws(
          E'\n',
          nullif(notes, ''),
          '[' || to_char(now(), 'DD/MM/YYYY HH24:MI') || '] '
          || 'HR menambah ' || p_days || ' hari. '
          || 'Keterangan: ' || v_description || '. '
          || 'Alasan HR: ' || v_reason
        ),
        approved_by = v_actor_email,
        approved_at = coalesce(approved_at, now()),
        hr_status = 'approved',
        hr_approved_by = v_actor_email,
        hr_approved_at = now(),
        updated_at = now()
      where id = v_existing_record.id;

      v_source_record_id := v_existing_record.id;

    elsif found then
      update public.phl_records
      set
        employee_id = v_employee.id,
        employee_number = v_employee.employee_number,
        machine_pin = v_employee.machine_pin,
        full_name = v_employee.full_name,
        department = v_employee.department,
        "position" = v_employee."position",
        source = 'attendance_phl_approved',
        status = 'approved',
        reason = v_description,
        balance_days = p_days,
        used_days = 0,
        remaining_days = p_days,
        valid_from = p_phl_date,
        expired_at = v_expired_at,
        notes = '[' || to_char(now(), 'DD/MM/YYYY HH24:MI') || '] '
          || 'Saldo disahkan HR. Keterangan: ' || v_description
          || '. Alasan HR: ' || v_reason,
        approved_by = v_actor_email,
        approved_at = now(),
        hr_status = 'approved',
        hr_approved_by = v_actor_email,
        hr_approved_at = now(),
        updated_at = now()
      where id = v_existing_record.id;

      v_source_record_id := v_existing_record.id;

    else
      insert into public.phl_records (
        employee_id,
        employee_number,
        machine_pin,
        full_name,
        department,
        "position",
        phl_date,
        source,
        status,
        reason,
        balance_days,
        used_days,
        remaining_days,
        valid_from,
        expired_at,
        notes,
        approved_by,
        approved_at,
        hr_status,
        hr_approved_by,
        hr_approved_at,
        created_at,
        updated_at
      )
      values (
        v_employee.id,
        v_employee.employee_number,
        v_employee.machine_pin,
        v_employee.full_name,
        v_employee.department,
        v_employee."position",
        p_phl_date,
        'attendance_phl_approved',
        'approved',
        v_description,
        p_days,
        0,
        p_days,
        p_phl_date,
        v_expired_at,
        '[' || to_char(now(), 'DD/MM/YYYY HH24:MI') || '] '
          || 'Saldo ditambahkan HR. Keterangan: ' || v_description
          || '. Alasan HR: ' || v_reason,
        v_actor_email,
        now(),
        'approved',
        v_actor_email,
        now(),
        now(),
        now()
      )
      returning id into v_source_record_id;
    end if;

  else
    if p_days > v_balance_before + 0.0001 then
      raise exception
        'Saldo PHL tersedia hanya % hari. Pengurangan % hari tidak dapat diproses.',
        v_balance_before,
        p_days;
    end if;

    v_remaining := p_days;

    for v_source in
      select pr.*
      from public.phl_records pr
      where pr.employee_id = v_employee.id
        and lower(coalesce(pr.source, '')) = 'attendance_phl_approved'
        and lower(coalesce(pr.status, '')) = 'approved'
        and coalesce(pr.remaining_days, 0) > 0
        and (pr.expired_at is null or pr.expired_at >= current_date)
      order by
        pr.expired_at asc nulls last,
        pr.valid_from asc nulls last,
        pr.created_at asc nulls last,
        pr.id
      for update
    loop
      exit when v_remaining <= 0;

      v_take := least(coalesce(v_source.remaining_days, 0), v_remaining);

      if v_take <= 0 then
        continue;
      end if;

      v_next_remaining := coalesce(v_source.remaining_days, 0) - v_take;
      v_next_used := coalesce(v_source.used_days, 0) + v_take;

      update public.phl_records
      set
        used_days = v_next_used,
        remaining_days = v_next_remaining,
        notes = concat_ws(
          E'\n',
          nullif(notes, ''),
          '[' || to_char(now(), 'DD/MM/YYYY HH24:MI') || '] '
          || 'HR mengurangi ' || v_take || ' hari. '
          || 'Keterangan: ' || v_description || '. '
          || 'Alasan HR: ' || v_reason
        ),
        updated_at = now()
      where id = v_source.id;

      insert into public.phl_hr_adjustment_allocations (
        adjustment_id,
        employee_id,
        allocation_type,
        source_record_id,
        allocated_days,
        remaining_before,
        remaining_after,
        used_before,
        used_after,
        source_expired_at,
        created_at
      )
      values (
        v_adjustment_id,
        v_employee.id,
        'phl_record',
        v_source.id,
        v_take,
        coalesce(v_source.remaining_days, 0),
        v_next_remaining,
        coalesce(v_source.used_days, 0),
        v_next_used,
        v_source.expired_at,
        now()
      );

      v_remaining := v_remaining - v_take;
    end loop;

    if v_remaining > 0 then
      select coalesce(lb.remaining_days, 0)
      into v_legacy_after
      from public.phl_employee_legacy_balances lb
      where lb.employee_id = v_employee.id
      for update;

      if v_remaining > v_legacy_after + 0.0001 then
        raise exception 'Saldo PHL ledger + legacy tidak mencukupi.';
      end if;

      update public.phl_employee_legacy_balances
      set
        remaining_days = remaining_days - v_remaining,
        updated_at = now()
      where employee_id = v_employee.id;

      insert into public.phl_hr_adjustment_allocations (
        adjustment_id,
        employee_id,
        allocation_type,
        source_record_id,
        allocated_days,
        remaining_before,
        remaining_after,
        used_before,
        used_after,
        source_expired_at,
        created_at
      )
      values (
        v_adjustment_id,
        v_employee.id,
        'legacy_balance',
        null,
        v_remaining,
        v_legacy_after,
        v_legacy_after - v_remaining,
        null,
        null,
        null,
        now()
      );

      v_remaining := 0;
    end if;
  end if;

  select coalesce(sum(coalesce(pr.remaining_days, 0)), 0)
  into v_ledger_after
  from public.phl_records pr
  where pr.employee_id = v_employee.id
    and lower(coalesce(pr.source, '')) = 'attendance_phl_approved'
    and lower(coalesce(pr.status, '')) = 'approved'
    and coalesce(pr.remaining_days, 0) > 0
    and (pr.expired_at is null or pr.expired_at >= current_date);

  select coalesce(lb.remaining_days, 0)
  into v_legacy_after
  from public.phl_employee_legacy_balances lb
  where lb.employee_id = v_employee.id;

  v_balance_after := v_ledger_after + v_legacy_after;

  update public.employees
  set phl_balance = v_balance_after
  where id = v_employee.id;

  update public.phl_hr_adjustments
  set
    source_record_id = v_source_record_id,
    balance_after = v_balance_after,
    active_ledger_after = v_ledger_after,
    legacy_after = v_legacy_after
  where id = v_adjustment_id;

  return jsonb_build_object(
    'success', true,
    'duplicate_request', false,
    'adjustment_id', v_adjustment_id,
    'employee_id', v_employee.id,
    'action', v_action,
    'days', p_days,
    'description', v_description,
    'reason', v_reason,
    'phl_date', case when v_action = 'add' then p_phl_date else null end,
    'expired_at', case when v_action = 'add' then v_expired_at else null end,
    'source_record_id', v_source_record_id,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'total_available_days', v_balance_after,
    'active_ledger_before', v_ledger_before,
    'active_ledger_after', v_ledger_after,
    'legacy_before', v_legacy_before,
    'legacy_after', v_legacy_after,
    'message', case
      when v_action = 'add'
        then 'Saldo PHL berhasil ditambahkan.'
      else 'Saldo PHL berhasil dikurangi.'
    end
  );
end;
$function$;


-- public.hr_approve_phl_claim_atomic(p_claim_record_id uuid, p_approved_by text, p_note text)
CREATE OR REPLACE FUNCTION public.hr_approve_phl_claim_atomic(p_claim_record_id uuid, p_approved_by text DEFAULT NULL::text, p_note text DEFAULT 'Disetujui oleh HR.'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_claim_before public.phl_records%rowtype;
  v_claim_after public.phl_records%rowtype;
  v_employee public.employees%rowtype;

  v_actor_role text;
  v_actor_email text;
  v_approved_by text;
  v_approval_note text;
  v_legacy_message text;

  v_claim_days numeric(10, 2) := 0;
  v_available_before numeric(10, 2) := 0;
  v_available_after numeric(10, 2) := 0;
  v_override_before numeric(10, 2) := null;
  v_override_after numeric(10, 2) := null;
  v_override_consumed numeric(10, 2) := 0;

  v_source_snapshot jsonb := '[]'::jsonb;
  v_snapshot_item jsonb;
  v_source_id uuid;
  v_source_balance numeric(10, 2);
  v_source_used_before numeric(10, 2);
  v_source_used_after numeric(10, 2);
  v_source_remaining_before numeric(10, 2);
  v_source_remaining_after numeric(10, 2);
  v_source_valid_from date;
  v_source_expired_at date;
  v_consumed numeric(10, 2);
  v_allocated_total numeric(10, 2) := 0;
  v_allocation_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Sesi login tidak ditemukan. Silakan login ulang.';
  end if;

  select
    lower(coalesce(au.role, '')),
    lower(coalesce(au.email, ''))
  into
    v_actor_role,
    v_actor_email
  from public.app_users au
  where au.id = auth.uid()
    and coalesce(au.is_active, true) = true
  limit 1;

  if not (
    coalesce(v_actor_role, '') like '%hr%'
    or coalesce(v_actor_role, '') like '%admin%'
  ) then
    raise exception 'Hanya akun HR/Admin aktif yang dapat menyetujui klaim PHL.';
  end if;

  v_approved_by := coalesce(
    nullif(btrim(coalesce(p_approved_by, '')), ''),
    nullif(v_actor_email, ''),
    'HR Administrator'
  );

  v_approval_note := coalesce(
    nullif(btrim(coalesce(p_note, '')), ''),
    'Disetujui oleh HR.'
  );

  select *
  into v_claim_before
  from public.phl_records
  where id = p_claim_record_id
  for update;

  if not found then
    raise exception 'Data klaim PHL tidak ditemukan.';
  end if;

  if lower(coalesce(v_claim_before.source, '')) <> 'employee_phl_claim' then
    raise exception 'Record ini bukan klaim PHL karyawan.';
  end if;

  if lower(coalesce(v_claim_before.status, '')) = 'approved'
     or lower(coalesce(v_claim_before.hr_status, '')) = 'approved' then
    return jsonb_build_object(
      'success', true,
      'already_approved', true,
      'claim_record_id', v_claim_before.id,
      'employee_id', v_claim_before.employee_id,
      'message', 'Klaim PHL sebelumnya sudah disetujui. Saldo tidak dipotong ulang.'
    );
  end if;

  if lower(coalesce(v_claim_before.status, '')) in ('rejected', 'cancelled', 'canceled')
     or lower(coalesce(v_claim_before.hr_status, '')) in ('rejected', 'cancelled', 'canceled') then
    raise exception 'Klaim PHL sudah ditolak atau dibatalkan dan tidak dapat langsung disetujui.';
  end if;

  if lower(coalesce(v_claim_before.supervisor_status, '')) = 'rejected' then
    raise exception 'Klaim PHL sudah ditolak atasan.';
  end if;

  if v_claim_before.employee_id is null then
    raise exception 'Klaim PHL belum terhubung ke data employee.';
  end if;

  if v_claim_before.phl_date is null then
    raise exception 'Tanggal klaim PHL belum tersedia.';
  end if;

  v_claim_days := coalesce(
    nullif(v_claim_before.used_days, 0),
    nullif(v_claim_before.balance_days, 0),
    0
  );

  if v_claim_days <= 0 then
    raise exception 'Jumlah hari klaim PHL harus lebih dari 0.';
  end if;

  if exists (
    select 1
    from public.attendance_period_confirmations apc
    where apc.employee_id = v_claim_before.employee_id
      and coalesce(apc.is_locked, false) = true
      and apc.period_start <= v_claim_before.phl_date
      and apc.period_end >= v_claim_before.phl_date
  ) then
    raise exception 'Periode absensi tanggal klaim sudah dikunci HR. Buka lock terlebih dahulu.';
  end if;

  if exists (
    select 1
    from public.attendance_logs al
    where al.employee_id = v_claim_before.employee_id
      and public.harmony_safe_date(al.attendance_date::text) = v_claim_before.phl_date
      and coalesce(al.is_locked, false) = true
      and al.deleted_at is null
  ) then
    raise exception 'Absensi pada tanggal klaim sudah dikunci HR. Buka lock terlebih dahulu.';
  end if;

  if exists (
    select 1
    from public.phl_claim_allocations pca
    where pca.claim_record_id = v_claim_before.id
      and pca.reversed_at is null
  ) then
    raise exception 'Klaim sudah memiliki alokasi aktif. Proses dihentikan untuk mencegah pemotongan ganda.';
  end if;

  -- Kunci semua saldo sumber yang dapat digunakan.
  perform pr.id
  from public.phl_records pr
  where pr.employee_id = v_claim_before.employee_id
    and lower(coalesce(pr.source, '')) = 'attendance_phl_approved'
    and lower(coalesce(pr.status, '')) = 'approved'
    and coalesce(pr.remaining_days, 0) > 0
    and (
      pr.expired_at is null
      or pr.expired_at >= current_date
    )
  order by
    pr.expired_at asc nulls last,
    pr.valid_from asc nulls last,
    pr.created_at asc nulls last,
    pr.id
  for update;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'source_record_id', pr.id,
        'balance_days', coalesce(pr.balance_days, 0),
        'used_before', coalesce(pr.used_days, 0),
        'remaining_before', coalesce(pr.remaining_days, 0),
        'valid_from', pr.valid_from,
        'expired_at', pr.expired_at
      )
      order by
        pr.expired_at asc nulls last,
        pr.valid_from asc nulls last,
        pr.created_at asc nulls last,
        pr.id
    ),
    '[]'::jsonb
  ),
  coalesce(sum(coalesce(pr.remaining_days, 0)), 0)
  into
    v_source_snapshot,
    v_available_before
  from public.phl_records pr
  where pr.employee_id = v_claim_before.employee_id
    and lower(coalesce(pr.source, '')) = 'attendance_phl_approved'
    and lower(coalesce(pr.status, '')) = 'approved'
    and coalesce(pr.remaining_days, 0) > 0
    and (
      pr.expired_at is null
      or pr.expired_at >= current_date
    );

  select *
  into v_employee
  from public.employees
  where id = v_claim_before.employee_id
  for update;

  if found then
    v_override_before := v_employee.phl_balance;
  end if;

  select public.approve_phl_claim(
    p_claim_record_id => v_claim_before.id,
    p_approved_by => v_approved_by
  )::text
  into v_legacy_message;

  update public.phl_records
  set
    hr_note = v_approval_note,
    hr_cancelled_by = null,
    hr_cancelled_at = null,
    hr_cancel_note = null,
    updated_at = now()
  where id = v_claim_before.id;

  select *
  into v_claim_after
  from public.phl_records
  where id = v_claim_before.id;

  if not found then
    raise exception 'Klaim PHL hilang setelah proses approval.';
  end if;

  if lower(coalesce(v_claim_after.status, '')) <> 'approved'
     and lower(coalesce(v_claim_after.hr_status, '')) <> 'approved' then
    raise exception
      'Engine approval PHL tidak menghasilkan status approved. Pesan engine: %',
      coalesce(v_legacy_message, '-');
  end if;

  -- Bandingkan saldo sumber sebelum dan sesudah engine lama.
  for v_snapshot_item in
    select value
    from jsonb_array_elements(v_source_snapshot)
  loop
    v_source_id := (v_snapshot_item ->> 'source_record_id')::uuid;
    v_source_balance := coalesce((v_snapshot_item ->> 'balance_days')::numeric, 0);
    v_source_used_before := coalesce((v_snapshot_item ->> 'used_before')::numeric, 0);
    v_source_remaining_before := coalesce((v_snapshot_item ->> 'remaining_before')::numeric, 0);
    v_source_valid_from := nullif(v_snapshot_item ->> 'valid_from', '')::date;
    v_source_expired_at := nullif(v_snapshot_item ->> 'expired_at', '')::date;

    select
      coalesce(pr.used_days, 0),
      coalesce(pr.remaining_days, 0)
    into
      v_source_used_after,
      v_source_remaining_after
    from public.phl_records pr
    where pr.id = v_source_id;

    if not found then
      raise exception 'Saldo PHL sumber % tidak ditemukan setelah approval.', v_source_id;
    end if;

    v_consumed := greatest(
      v_source_remaining_before - v_source_remaining_after,
      0
    );

    if v_consumed > 0 then
      insert into public.phl_claim_allocations (
        claim_record_id,
        source_record_id,
        employee_id,
        allocated_days,
        source_balance_days,
        source_used_before,
        source_used_after,
        source_remaining_before,
        source_remaining_after,
        source_valid_from,
        source_expired_at,
        allocated_by,
        allocated_by_email,
        metadata
      )
      values (
        v_claim_before.id,
        v_source_id,
        v_claim_before.employee_id,
        v_consumed,
        v_source_balance,
        v_source_used_before,
        v_source_used_after,
        v_source_remaining_before,
        v_source_remaining_after,
        v_source_valid_from,
        v_source_expired_at,
        auth.uid(),
        v_approved_by,
        jsonb_build_object(
          'capture_method', 'before_after_snapshot',
          'balance_engine', 'legacy_approve_phl_claim'
        )
      )
      on conflict (claim_record_id, source_record_id)
      do update set
        allocated_days = excluded.allocated_days,
        source_balance_days = excluded.source_balance_days,
        source_used_before = excluded.source_used_before,
        source_used_after = excluded.source_used_after,
        source_remaining_before = excluded.source_remaining_before,
        source_remaining_after = excluded.source_remaining_after,
        source_valid_from = excluded.source_valid_from,
        source_expired_at = excluded.source_expired_at,
        allocated_by = excluded.allocated_by,
        allocated_by_email = excluded.allocated_by_email,
        allocated_at = now(),
        reversed_by = null,
        reversed_by_email = null,
        reversed_at = null,
        reversal_note = null,
        metadata = excluded.metadata;

      v_allocated_total := v_allocated_total + v_consumed;
      v_allocation_count := v_allocation_count + 1;
    end if;
  end loop;

  select coalesce(sum(coalesce(pr.remaining_days, 0)), 0)
  into v_available_after
  from public.phl_records pr
  where pr.employee_id = v_claim_before.employee_id
    and lower(coalesce(pr.source, '')) = 'attendance_phl_approved'
    and lower(coalesce(pr.status, '')) = 'approved'
    and coalesce(pr.remaining_days, 0) > 0
    and (
      pr.expired_at is null
      or pr.expired_at >= current_date
    );

  select e.phl_balance
  into v_override_after
  from public.employees e
  where e.id = v_claim_before.employee_id;

  if v_override_before is not null and v_override_after is not null then
    v_override_consumed := greatest(v_override_before - v_override_after, 0);

    -- BUG-009: employees.phl_balance is an effective-balance mirror.
    -- The mirror delta after FIFO consumption is NOT a second/manual debit.
    -- Null audit override values also keep future reversal FIFO-only.
    v_override_before := null;
    v_override_after := null;
    v_override_consumed := 0;
  end if;

  -- Approval hanya diterima bila setiap hari yang dipotong dapat dilacak.
  if abs((v_allocated_total + v_override_consumed) - v_claim_days) > 0.0001 then
    raise exception
      'Pemotongan saldo PHL tidak dapat dilacak penuh. Klaim: % hari, alokasi FIFO: % hari, saldo manual: % hari. Seluruh proses dibatalkan.',
      v_claim_days,
      v_allocated_total,
      v_override_consumed;
  end if;

  insert into public.phl_claim_audit_logs (
    claim_record_id,
    employee_id,
    employee_number,
    full_name,
    action,
    claim_days,
    source,
    status_before,
    status_after,
    hr_status_before,
    hr_status_after,
    available_balance_before,
    available_balance_after,
    employee_override_before,
    employee_override_after,
    actor_user_id,
    actor_email,
    note,
    legacy_message,
    metadata
  )
  values (
    v_claim_before.id,
    v_claim_before.employee_id,
    v_claim_before.employee_number,
    v_claim_before.full_name,
    'hr_approved',
    v_claim_days,
    v_claim_before.source,
    v_claim_before.status,
    v_claim_after.status,
    v_claim_before.hr_status,
    v_claim_after.hr_status,
    v_available_before,
    v_available_after,
    v_override_before,
    v_override_after,
    auth.uid(),
    v_approved_by,
    v_approval_note,
    v_legacy_message,
    jsonb_build_object(
      'phl_date', v_claim_before.phl_date,
      'supervisor_status', v_claim_before.supervisor_status,
      'balance_engine', 'legacy_approve_phl_claim',
      'allocation_count', v_allocation_count,
      'allocated_fifo_days', v_allocated_total,
      'employee_override_consumed', v_override_consumed,
      'reversal_ready', true
    )
  );

  return jsonb_build_object(
    'success', true,
    'already_approved', false,
    'claim_record_id', v_claim_after.id,
    'employee_id', v_claim_after.employee_id,
    'claim_days', v_claim_days,
    'available_balance_before', v_available_before,
    'available_balance_after', v_available_after,
    'employee_override_before', v_override_before,
    'employee_override_after', v_override_after,
    'allocated_fifo_days', v_allocated_total,
    'employee_override_consumed', v_override_consumed,
    'allocation_count', v_allocation_count,
    'legacy_message', v_legacy_message,
    'message', 'Klaim PHL berhasil disetujui, alokasi FIFO tercatat, dan reversal siap digunakan.'
  );
end;
$function$;


-- public.hr_cancel_approved_phl_claim_atomic(p_claim_record_id uuid, p_cancelled_by text, p_note text)
CREATE OR REPLACE FUNCTION public.hr_cancel_approved_phl_claim_atomic(p_claim_record_id uuid, p_cancelled_by text DEFAULT NULL::text, p_note text DEFAULT 'Dibatalkan oleh HR.'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_claim_before public.phl_records%rowtype;
  v_claim_after public.phl_records%rowtype;
  v_source public.phl_records%rowtype;
  v_allocation public.phl_claim_allocations%rowtype;

  v_actor_role text;
  v_actor_email text;
  v_cancelled_by text;
  v_cancel_note text;

  v_claim_days numeric(10, 2) := 0;
  v_allocation_total numeric(10, 2) := 0;
  v_override_before_approval numeric(10, 2) := null;
  v_override_after_approval numeric(10, 2) := null;
  v_override_restore numeric(10, 2) := 0;
  v_employee_override_before_cancel numeric(10, 2) := null;
  v_employee_override_after_cancel numeric(10, 2) := null;

  v_available_before numeric(10, 2) := 0;
  v_available_after numeric(10, 2) := 0;
  v_restored_fifo_days numeric(10, 2) := 0;
  v_restored_active_days numeric(10, 2) := 0;
  v_restored_expired_days numeric(10, 2) := 0;
  v_allocation_count integer := 0;
  v_next_used numeric(10, 2);
  v_next_remaining numeric(10, 2);
begin
  if auth.uid() is null then
    raise exception 'Sesi login tidak ditemukan. Silakan login ulang.';
  end if;

  select
    lower(coalesce(au.role, '')),
    lower(coalesce(au.email, ''))
  into
    v_actor_role,
    v_actor_email
  from public.app_users au
  where au.id = auth.uid()
    and coalesce(au.is_active, true) = true
  limit 1;

  if not (
    coalesce(v_actor_role, '') like '%hr%'
    or coalesce(v_actor_role, '') like '%admin%'
  ) then
    raise exception 'Hanya akun HR/Admin aktif yang dapat membatalkan klaim PHL.';
  end if;

  v_cancelled_by := coalesce(
    nullif(btrim(coalesce(p_cancelled_by, '')), ''),
    nullif(v_actor_email, ''),
    'HR Administrator'
  );

  v_cancel_note := coalesce(
    nullif(btrim(coalesce(p_note, '')), ''),
    'Dibatalkan oleh HR.'
  );

  if length(v_cancel_note) < 5 then
    raise exception 'Alasan pembatalan minimal 5 karakter.';
  end if;

  select *
  into v_claim_before
  from public.phl_records
  where id = p_claim_record_id
  for update;

  if not found then
    raise exception 'Data klaim PHL tidak ditemukan.';
  end if;

  if lower(coalesce(v_claim_before.source, '')) <> 'employee_phl_claim' then
    raise exception 'Record ini bukan klaim PHL karyawan.';
  end if;

  if lower(coalesce(v_claim_before.status, '')) in ('cancelled', 'canceled')
     or lower(coalesce(v_claim_before.hr_status, '')) in ('cancelled', 'canceled') then
    return jsonb_build_object(
      'success', true,
      'already_cancelled', true,
      'claim_record_id', v_claim_before.id,
      'employee_id', v_claim_before.employee_id,
      'message', 'Klaim PHL sebelumnya sudah dibatalkan. Saldo tidak dikembalikan ulang.'
    );
  end if;

  if lower(coalesce(v_claim_before.status, '')) <> 'approved'
     and lower(coalesce(v_claim_before.hr_status, '')) <> 'approved' then
    raise exception 'Hanya klaim PHL yang sudah approved yang dapat dibatalkan.';
  end if;

  if exists (
    select 1
    from public.phl_claim_audit_logs pcal
    where pcal.claim_record_id = v_claim_before.id
      and pcal.action = 'hr_cancelled'
  ) then
    raise exception 'Audit pembatalan klaim sudah tersedia. Reversal kedua diblokir.';
  end if;

  if v_claim_before.employee_id is null then
    raise exception 'Klaim PHL belum terhubung ke data employee.';
  end if;

  if v_claim_before.phl_date is null then
    raise exception 'Tanggal klaim PHL belum tersedia.';
  end if;

  if exists (
    select 1
    from public.attendance_period_confirmations apc
    where apc.employee_id = v_claim_before.employee_id
      and coalesce(apc.is_locked, false) = true
      and apc.period_start <= v_claim_before.phl_date
      and apc.period_end >= v_claim_before.phl_date
  ) then
    raise exception 'Periode absensi tanggal klaim sudah dikunci HR. Buka lock terlebih dahulu.';
  end if;

  if exists (
    select 1
    from public.attendance_logs al
    where al.employee_id = v_claim_before.employee_id
      and public.harmony_safe_date(al.attendance_date::text) = v_claim_before.phl_date
      and coalesce(al.is_locked, false) = true
      and al.deleted_at is null
  ) then
    raise exception 'Absensi pada tanggal klaim sudah dikunci HR. Buka lock terlebih dahulu.';
  end if;

  v_claim_days := coalesce(
    nullif(v_claim_before.used_days, 0),
    nullif(v_claim_before.balance_days, 0),
    0
  );

  select
    coalesce(sum(pca.allocated_days), 0),
    count(*)::integer
  into
    v_allocation_total,
    v_allocation_count
  from public.phl_claim_allocations pca
  where pca.claim_record_id = v_claim_before.id
    and pca.reversed_at is null;

  select
    pcal.employee_override_before,
    pcal.employee_override_after
  into
    v_override_before_approval,
    v_override_after_approval
  from public.phl_claim_audit_logs pcal
  where pcal.claim_record_id = v_claim_before.id
    and pcal.action = 'hr_approved'
  order by pcal.created_at desc
  limit 1;

  if v_override_before_approval is not null
     and v_override_after_approval is not null then
    v_override_restore := greatest(
      v_override_before_approval - v_override_after_approval,
      0
    );
  end if;

  if abs((v_allocation_total + v_override_restore) - v_claim_days) > 0.0001 then
    raise exception
      'Reversal aman tidak dapat dilakukan karena alokasi historis belum lengkap. Klaim: % hari, alokasi FIFO: % hari, saldo manual: % hari. Gunakan koreksi saldo manual dengan audit HR.',
      v_claim_days,
      v_allocation_total,
      v_override_restore;
  end if;

  select coalesce(sum(coalesce(pr.remaining_days, 0)), 0)
  into v_available_before
  from public.phl_records pr
  where pr.employee_id = v_claim_before.employee_id
    and lower(coalesce(pr.source, '')) = 'attendance_phl_approved'
    and lower(coalesce(pr.status, '')) = 'approved'
    and coalesce(pr.remaining_days, 0) > 0
    and (
      pr.expired_at is null
      or pr.expired_at >= current_date
    );

  -- Restore setiap alokasi ke saldo sumber aslinya.
  for v_allocation in
    select pca.*
    from public.phl_claim_allocations pca
    where pca.claim_record_id = v_claim_before.id
      and pca.reversed_at is null
    order by pca.allocated_at, pca.id
    for update
  loop
    select *
    into v_source
    from public.phl_records
    where id = v_allocation.source_record_id
    for update;

    if not found then
      raise exception
        'Saldo PHL sumber % tidak ditemukan. Reversal dibatalkan.',
        v_allocation.source_record_id;
    end if;

    if coalesce(v_source.used_days, 0) + 0.0001 < v_allocation.allocated_days then
      raise exception
        'Used days saldo sumber % lebih kecil dari alokasi reversal.',
        v_allocation.source_record_id;
    end if;

    v_next_used := greatest(
      coalesce(v_source.used_days, 0) - v_allocation.allocated_days,
      0
    );

    v_next_remaining :=
      coalesce(v_source.remaining_days, 0) + v_allocation.allocated_days;

    if v_source.balance_days is not null
       and v_next_remaining > v_source.balance_days + 0.0001 then
      raise exception
        'Reversal akan membuat sisa saldo sumber % melebihi total saldo.',
        v_allocation.source_record_id;
    end if;

    update public.phl_records
    set
      used_days = v_next_used,
      remaining_days = v_next_remaining,
      updated_at = now()
    where id = v_source.id;

    update public.phl_claim_allocations
    set
      reversed_by = auth.uid(),
      reversed_by_email = v_cancelled_by,
      reversed_at = now(),
      reversal_note = v_cancel_note
    where id = v_allocation.id;

    v_restored_fifo_days :=
      v_restored_fifo_days + v_allocation.allocated_days;

    if v_allocation.source_expired_at is not null
       and v_allocation.source_expired_at < current_date then
      v_restored_expired_days :=
        v_restored_expired_days + v_allocation.allocated_days;
    else
      v_restored_active_days :=
        v_restored_active_days + v_allocation.allocated_days;
    end if;
  end loop;

  -- Restore saldo manual employee bila approval sebelumnya memotong override.
  select e.phl_balance
  into v_employee_override_before_cancel
  from public.employees e
  where e.id = v_claim_before.employee_id
  for update;

  if v_override_restore > 0 then
    update public.employees
    set
      phl_balance = coalesce(phl_balance, 0) + v_override_restore,
      updated_at = now()
    where id = v_claim_before.employee_id;
  end if;

  select e.phl_balance
  into v_employee_override_after_cancel
  from public.employees e
  where e.id = v_claim_before.employee_id;

  update public.phl_records
  set
    status = 'cancelled',
    hr_status = 'cancelled',
    hr_cancelled_by = v_cancelled_by,
    hr_cancelled_at = now(),
    hr_cancel_note = v_cancel_note,
    hr_note = v_cancel_note,
    updated_at = now()
  where id = v_claim_before.id;

  select *
  into v_claim_after
  from public.phl_records
  where id = v_claim_before.id;

  select coalesce(sum(coalesce(pr.remaining_days, 0)), 0)
  into v_available_after
  from public.phl_records pr
  where pr.employee_id = v_claim_before.employee_id
    and lower(coalesce(pr.source, '')) = 'attendance_phl_approved'
    and lower(coalesce(pr.status, '')) = 'approved'
    and coalesce(pr.remaining_days, 0) > 0
    and (
      pr.expired_at is null
      or pr.expired_at >= current_date
    );

  insert into public.phl_claim_audit_logs (
    claim_record_id,
    employee_id,
    employee_number,
    full_name,
    action,
    claim_days,
    source,
    status_before,
    status_after,
    hr_status_before,
    hr_status_after,
    available_balance_before,
    available_balance_after,
    employee_override_before,
    employee_override_after,
    actor_user_id,
    actor_email,
    note,
    legacy_message,
    metadata
  )
  values (
    v_claim_before.id,
    v_claim_before.employee_id,
    v_claim_before.employee_number,
    v_claim_before.full_name,
    'hr_cancelled',
    v_claim_days,
    v_claim_before.source,
    v_claim_before.status,
    v_claim_after.status,
    v_claim_before.hr_status,
    v_claim_after.hr_status,
    v_available_before,
    v_available_after,
    v_employee_override_before_cancel,
    v_employee_override_after_cancel,
    auth.uid(),
    v_cancelled_by,
    v_cancel_note,
    null,
    jsonb_build_object(
      'phl_date', v_claim_before.phl_date,
      'allocation_count', v_allocation_count,
      'restored_fifo_days', v_restored_fifo_days,
      'restored_employee_override_days', v_override_restore,
      'restored_active_days', v_restored_active_days,
      'restored_expired_days', v_restored_expired_days,
      'original_expiry_preserved', true
    )
  );

  return jsonb_build_object(
    'success', true,
    'already_cancelled', false,
    'claim_record_id', v_claim_after.id,
    'employee_id', v_claim_after.employee_id,
    'claim_days', v_claim_days,
    'allocation_count', v_allocation_count,
    'restored_fifo_days', v_restored_fifo_days,
    'restored_employee_override_days', v_override_restore,
    'restored_active_days', v_restored_active_days,
    'restored_expired_days', v_restored_expired_days,
    'available_balance_before', v_available_before,
    'available_balance_after', v_available_after,
    'employee_override_before', v_employee_override_before_cancel,
    'employee_override_after', v_employee_override_after_cancel,
    'message', 'Klaim PHL berhasil dibatalkan dan saldo dikembalikan ke sumber FIFO asli.'
  );
end;
$function$;


-- public.hr_get_employee_phl_balance_detail(p_employee_id uuid)
CREATE OR REPLACE FUNCTION public.hr_get_employee_phl_balance_detail(p_employee_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_employee public.employees%rowtype;
  v_actor_role text;
  v_active_balance numeric(10, 2) := 0;
  v_active_ledger numeric(10, 2) := 0;
  v_legacy_balance numeric(10, 2) := 0;
  v_expired_balance numeric(10, 2) := 0;
  v_expiring_30_days numeric(10, 2) := 0;
  v_next_expiry date := null;
  v_lots jsonb := '[]'::jsonb;
  v_adjustments jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sesi login tidak ditemukan. Silakan login ulang.';
  end if;

  select lower(coalesce(au.role, ''))
  into v_actor_role
  from public.app_users au
  where au.id = auth.uid()
    and coalesce(au.is_active, true) = true
  limit 1;

  if not (
    coalesce(v_actor_role, '') like '%hr%'
    or coalesce(v_actor_role, '') like '%admin%'
  ) then
    raise exception 'Hanya akun HR/Admin aktif yang dapat membuka detail saldo PHL karyawan.';
  end if;

  select *
  into v_employee
  from public.employees
  where id = p_employee_id;

  if not found then
    raise exception 'Data karyawan tidak ditemukan.';
  end if;

  select
    coalesce(
      sum(
        case
          when coalesce(pr.remaining_days, 0) > 0
            and (
              pr.expired_at is null
              or pr.expired_at >= current_date
            )
          then coalesce(pr.remaining_days, 0)
          else 0
        end
      ),
      0
    ),
    coalesce(
      sum(
        case
          when coalesce(pr.remaining_days, 0) > 0
            and pr.expired_at is not null
            and pr.expired_at < current_date
          then coalesce(pr.remaining_days, 0)
          else 0
        end
      ),
      0
    ),
    coalesce(
      sum(
        case
          when coalesce(pr.remaining_days, 0) > 0
            and pr.expired_at between current_date and current_date + 30
          then coalesce(pr.remaining_days, 0)
          else 0
        end
      ),
      0
    ),
    min(pr.expired_at) filter (
      where coalesce(pr.remaining_days, 0) > 0
        and pr.expired_at is not null
        and pr.expired_at >= current_date
    )
  into
    v_active_ledger,
    v_expired_balance,
    v_expiring_30_days,
    v_next_expiry
  from public.phl_records pr
  where pr.employee_id = v_employee.id
    and lower(coalesce(pr.source, '')) = 'attendance_phl_approved'
    and lower(coalesce(pr.status, '')) = 'approved';

  select coalesce(lb.remaining_days, 0)
  into v_legacy_balance
  from public.phl_employee_legacy_balances lb
  where lb.employee_id = v_employee.id;

  v_active_balance :=
    public.phl_sync_employee_effective_balance(v_employee.id);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', lot.id,
        'phl_date', lot.phl_date,
        'valid_from', lot.valid_from,
        'expired_at', lot.expired_at,
        'balance_days', lot.balance_days,
        'used_days', lot.used_days,
        'remaining_days', lot.remaining_days,
        'reason', lot.reason,
        'notes', lot.notes,
        'is_expired', (
          lot.expired_at is not null
          and lot.expired_at < current_date
        ),
        'days_to_expiry', case
          when lot.expired_at is null then null
          else lot.expired_at - current_date
        end
      )
      order by
        lot.expired_at asc nulls last,
        lot.phl_date desc nulls last,
        lot.created_at desc
    ),
    '[]'::jsonb
  )
  into v_lots
  from (
    select pr.*
    from public.phl_records pr
    where pr.employee_id = v_employee.id
      and lower(coalesce(pr.source, '')) = 'attendance_phl_approved'
      and lower(coalesce(pr.status, '')) = 'approved'
    order by
      pr.expired_at asc nulls last,
      pr.phl_date desc nulls last,
      pr.created_at desc
    limit 50
  ) lot;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', adj.id,
        'action', adj.action,
        'days', adj.days,
        'phl_date', adj.phl_date,
        'expired_at', adj.expired_at,
        'balance_before', adj.balance_before,
        'balance_after', adj.balance_after,
        'reason', adj.reason,
        'actor_email', adj.actor_email,
        'created_at', adj.created_at
      )
      order by adj.created_at desc
    ),
    '[]'::jsonb
  )
  into v_adjustments
  from (
    select a.*
    from public.phl_hr_adjustments a
    where a.employee_id = v_employee.id
    order by a.created_at desc
    limit 30
  ) adj;

  return jsonb_build_object(
    'success', true,
    'employee_id', v_employee.id,
    'employee_number', v_employee.employee_number,
    'full_name', v_employee.full_name,
    'active_balance', v_active_balance,
    'active_ledger_balance', v_active_ledger,
    'legacy_balance', v_legacy_balance,
    'expired_balance', v_expired_balance,
    'expiring_30_days', v_expiring_30_days,
    'next_expiry', v_next_expiry,
    'expiry_rule_days', 90,
    'lots', v_lots,
    'adjustments', v_adjustments
  );
end;
$function$;


-- public.hr_get_employee_phl_balance_detail_v2(p_employee_id uuid)
CREATE OR REPLACE FUNCTION public.hr_get_employee_phl_balance_detail_v2(p_employee_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_employee public.employees%rowtype;
  v_active_balance numeric(10,2) := 0;
  v_active_ledger numeric(10,2) := 0;
  v_legacy_balance numeric(10,2) := 0;
  v_expired_balance numeric(10,2) := 0;
  v_expiring_30_days numeric(10,2) := 0;
  v_next_expiry date := null;
  v_lots jsonb := '[]'::jsonb;
  v_adjustments jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sesi login tidak ditemukan. Silakan login ulang.';
  end if;

  if not public.harmony_is_active_hr_admin() then
    raise exception 'Hanya akun HR/Admin aktif yang dapat membuka detail saldo PHL.';
  end if;

  select *
  into v_employee
  from public.employees
  where id = p_employee_id;

  if not found then
    raise exception 'Data karyawan tidak ditemukan.';
  end if;

  insert into public.phl_employee_legacy_balances (
    employee_id,
    initial_days,
    remaining_days,
    captured_employee_balance,
    captured_active_ledger,
    captured_at,
    updated_at
  )
  values (
    v_employee.id, 0, 0, 0, 0, now(), now()
  )
  on conflict (employee_id) do nothing;

  select
    coalesce(sum(
      case
        when coalesce(pr.remaining_days, 0) > 0
          and (pr.expired_at is null or pr.expired_at >= current_date)
        then coalesce(pr.remaining_days, 0)
        else 0
      end
    ), 0),
    coalesce(sum(
      case
        when coalesce(pr.remaining_days, 0) > 0
          and pr.expired_at is not null
          and pr.expired_at < current_date
        then coalesce(pr.remaining_days, 0)
        else 0
      end
    ), 0),
    coalesce(sum(
      case
        when coalesce(pr.remaining_days, 0) > 0
          and pr.expired_at between current_date and current_date + 30
        then coalesce(pr.remaining_days, 0)
        else 0
      end
    ), 0),
    min(pr.expired_at) filter (
      where coalesce(pr.remaining_days, 0) > 0
        and pr.expired_at is not null
        and pr.expired_at >= current_date
    )
  into
    v_active_ledger,
    v_expired_balance,
    v_expiring_30_days,
    v_next_expiry
  from public.phl_records pr
  where pr.employee_id = v_employee.id
    and lower(coalesce(pr.source, '')) = 'attendance_phl_approved'
    and lower(coalesce(pr.status, '')) = 'approved';

  select coalesce(lb.remaining_days, 0)
  into v_legacy_balance
  from public.phl_employee_legacy_balances lb
  where lb.employee_id = v_employee.id;

  v_active_balance := v_active_ledger + v_legacy_balance;

  -- Mirror untuk halaman lain yang masih membaca employees.phl_balance.
  update public.employees
  set phl_balance = v_active_balance
  where id = v_employee.id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', lot.id,
        'phl_date', lot.phl_date,
        'valid_from', lot.valid_from,
        'expired_at', lot.expired_at,
        'balance_days', lot.balance_days,
        'used_days', lot.used_days,
        'remaining_days', lot.remaining_days,
        'description', lot.reason,
        'reason', lot.reason,
        'notes', lot.notes,
        'is_expired', (
          lot.expired_at is not null
          and lot.expired_at < current_date
        ),
        'days_to_expiry', case
          when lot.expired_at is null then null
          else lot.expired_at - current_date
        end
      )
      order by lot.expired_at asc nulls last, lot.phl_date desc nulls last, lot.created_at desc
    ),
    '[]'::jsonb
  )
  into v_lots
  from (
    select pr.*
    from public.phl_records pr
    where pr.employee_id = v_employee.id
      and lower(coalesce(pr.source, '')) = 'attendance_phl_approved'
      and lower(coalesce(pr.status, '')) = 'approved'
    order by pr.expired_at asc nulls last, pr.phl_date desc nulls last, pr.created_at desc
    limit 50
  ) lot;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', adj.id,
        'action', adj.action,
        'days', adj.days,
        'phl_date', adj.phl_date,
        'expired_at', adj.expired_at,
        'balance_before', adj.balance_before,
        'balance_after', adj.balance_after,
        'description', adj.description,
        'reason', adj.reason,
        'actor_email', adj.actor_email,
        'created_at', adj.created_at
      )
      order by adj.created_at desc
    ),
    '[]'::jsonb
  )
  into v_adjustments
  from (
    select a.*
    from public.phl_hr_adjustments a
    where a.employee_id = v_employee.id
    order by a.created_at desc
    limit 30
  ) adj;

  return jsonb_build_object(
    'success', true,
    'employee_id', v_employee.id,
    'employee_number', v_employee.employee_number,
    'full_name', v_employee.full_name,
    'active_balance', v_active_balance,
    'total_available_days', v_active_balance,
    'active_ledger_balance', v_active_ledger,
    'legacy_balance', v_legacy_balance,
    'expired_balance', v_expired_balance,
    'expiring_30_days', v_expiring_30_days,
    'next_expiry', v_next_expiry,
    'expiry_rule_days', 90,
    'lots', v_lots,
    'adjustments', v_adjustments
  );
end;
$function$;


-- public.hr_get_legacy_phl_claims()
CREATE OR REPLACE FUNCTION public.hr_get_legacy_phl_claims()
 RETURNS TABLE(claim_record_id uuid, employee_id uuid, employee_number text, full_name text, department text, "position" text, phl_date date, claim_days numeric, allocated_days numeric, override_consumed_days numeric, tracking_gap_days numeric, legacy_review_status text, legacy_review_note text, legacy_reviewed_by text, legacy_reviewed_at timestamp with time zone, hr_approved_by text, hr_approved_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor_role text;
begin
  if auth.uid() is null then
    raise exception 'Sesi login tidak ditemukan. Silakan login ulang.';
  end if;

  select lower(coalesce(au.role, ''))
  into v_actor_role
  from public.app_users au
  where au.id = auth.uid()
    and coalesce(au.is_active, true) = true
  limit 1;

  if not (
    coalesce(v_actor_role, '') like '%hr%'
    or coalesce(v_actor_role, '') like '%admin%'
  ) then
    raise exception 'Hanya akun HR/Admin aktif yang dapat membuka klaim legacy PHL.';
  end if;

  return query
  with tracking as (
    select
      claim.id as claim_record_id,
      claim.employee_id,
      claim.employee_number,
      claim.full_name,
      claim.department,
      claim.position,
      claim.phl_date,
      coalesce(
        nullif(claim.used_days, 0),
        nullif(claim.balance_days, 0),
        0
      )::numeric as claim_days,
      coalesce(allocation_data.allocated_days, 0)::numeric as allocated_days,
      coalesce(approval_data.override_consumed_days, 0)::numeric as override_consumed_days,
      abs(
        coalesce(
          nullif(claim.used_days, 0),
          nullif(claim.balance_days, 0),
          0
        )::numeric
        -
        (
          coalesce(allocation_data.allocated_days, 0)::numeric
          +
          coalesce(approval_data.override_consumed_days, 0)::numeric
        )
      )::numeric as tracking_gap_days,
      claim.legacy_review_status,
      claim.legacy_review_note,
      claim.legacy_reviewed_by,
      claim.legacy_reviewed_at,
      claim.hr_approved_by,
      claim.hr_approved_at
    from public.phl_records claim
    left join lateral (
      select
        coalesce(sum(pca.allocated_days), 0)::numeric as allocated_days
      from public.phl_claim_allocations pca
      where pca.claim_record_id = claim.id
        and pca.reversed_at is null
    ) allocation_data on true
    left join lateral (
      select
        greatest(
          coalesce(pcal.employee_override_before, 0)
          -
          coalesce(pcal.employee_override_after, 0),
          0
        )::numeric as override_consumed_days
      from public.phl_claim_audit_logs pcal
      where pcal.claim_record_id = claim.id
        and pcal.action = 'hr_approved'
      order by pcal.created_at desc
      limit 1
    ) approval_data on true
    where lower(coalesce(claim.source, '')) = 'employee_phl_claim'
      and (
        lower(coalesce(claim.status, '')) = 'approved'
        or lower(coalesce(claim.hr_status, '')) = 'approved'
      )
  )
  select
    t.claim_record_id,
    t.employee_id,
    t.employee_number::text,
    t.full_name::text,
    t.department::text,
    t.position::text,
    t.phl_date,
    t.claim_days,
    t.allocated_days,
    t.override_consumed_days,
    t.tracking_gap_days,
    t.legacy_review_status::text,
    t.legacy_review_note::text,
    t.legacy_reviewed_by::text,
    t.legacy_reviewed_at,
    t.hr_approved_by::text,
    t.hr_approved_at
  from tracking t
  where t.tracking_gap_days > 0.0001
  order by
    case
      when lower(coalesce(t.legacy_review_status, '')) = 'reviewed' then 2
      else 1
    end,
    t.hr_approved_at desc nulls last,
    t.phl_date desc nulls last;
end;
$function$;


-- public.hr_get_phl_reconciliation()
CREATE OR REPLACE FUNCTION public.hr_get_phl_reconciliation()
 RETURNS TABLE(employee_id uuid, employee_number text, full_name text, department text, "position" text, manual_phl_balance numeric, active_ledger_balance numeric, manual_ledger_difference numeric, expired_remaining_balance numeric, total_earned_days numeric, total_used_days numeric, pending_claim_count bigint, approved_claim_count bigint, legacy_untracked_claim_count bigint, reviewed_legacy_claim_count bigint, reconciliation_status text, last_reviewed_by text, last_reviewed_at timestamp with time zone, last_review_note text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor_role text;
begin
  if auth.uid() is null then
    raise exception 'Sesi login tidak ditemukan. Silakan login ulang.';
  end if;

  select lower(coalesce(au.role, ''))
  into v_actor_role
  from public.app_users au
  where au.id = auth.uid()
    and coalesce(au.is_active, true) = true
  limit 1;

  if not (
    coalesce(v_actor_role, '') like '%hr%'
    or coalesce(v_actor_role, '') like '%admin%'
  ) then
    raise exception 'Hanya akun HR/Admin aktif yang dapat membuka rekonsiliasi PHL.';
  end if;

  return query
  with source_agg as (
    select
      pr.employee_id,
      coalesce(sum(coalesce(pr.balance_days, 0)), 0)::numeric as total_earned_days,
      coalesce(sum(coalesce(pr.used_days, 0)), 0)::numeric as total_used_days,
      coalesce(
        sum(
          case
            when lower(coalesce(pr.status, '')) = 'approved'
              and coalesce(pr.remaining_days, 0) > 0
              and (
                pr.expired_at is null
                or pr.expired_at >= current_date
              )
            then coalesce(pr.remaining_days, 0)
            else 0
          end
        ),
        0
      )::numeric as active_ledger_balance,
      coalesce(
        sum(
          case
            when lower(coalesce(pr.status, '')) = 'approved'
              and coalesce(pr.remaining_days, 0) > 0
              and pr.expired_at is not null
              and pr.expired_at < current_date
            then coalesce(pr.remaining_days, 0)
            else 0
          end
        ),
        0
      )::numeric as expired_remaining_balance
    from public.phl_records pr
    where lower(coalesce(pr.source, '')) = 'attendance_phl_approved'
      and pr.employee_id is not null
    group by pr.employee_id
  ),
  claim_tracking as (
    select
      claim.id as claim_record_id,
      claim.employee_id,
      coalesce(
        nullif(claim.used_days, 0),
        nullif(claim.balance_days, 0),
        0
      )::numeric as claim_days,
      coalesce(allocation_data.allocated_days, 0)::numeric as allocated_days,
      coalesce(approval_data.override_consumed_days, 0)::numeric as override_consumed_days,
      abs(
        coalesce(
          nullif(claim.used_days, 0),
          nullif(claim.balance_days, 0),
          0
        )::numeric
        -
        (
          coalesce(allocation_data.allocated_days, 0)::numeric
          +
          coalesce(approval_data.override_consumed_days, 0)::numeric
        )
      )::numeric as tracking_gap_days,
      lower(coalesce(claim.legacy_review_status, '')) as legacy_review_status
    from public.phl_records claim
    left join lateral (
      select
        coalesce(sum(pca.allocated_days), 0)::numeric as allocated_days
      from public.phl_claim_allocations pca
      where pca.claim_record_id = claim.id
        and pca.reversed_at is null
    ) allocation_data on true
    left join lateral (
      select
        greatest(
          coalesce(pcal.employee_override_before, 0)
          -
          coalesce(pcal.employee_override_after, 0),
          0
        )::numeric as override_consumed_days
      from public.phl_claim_audit_logs pcal
      where pcal.claim_record_id = claim.id
        and pcal.action = 'hr_approved'
      order by pcal.created_at desc
      limit 1
    ) approval_data on true
    where lower(coalesce(claim.source, '')) = 'employee_phl_claim'
      and (
        lower(coalesce(claim.status, '')) = 'approved'
        or lower(coalesce(claim.hr_status, '')) = 'approved'
      )
      and claim.employee_id is not null
  ),
  claim_agg as (
    select
      ct.employee_id,
      count(*)::bigint as approved_claim_count,
      count(*) filter (
        where ct.tracking_gap_days > 0.0001
      )::bigint as legacy_untracked_claim_count,
      count(*) filter (
        where ct.tracking_gap_days > 0.0001
          and ct.legacy_review_status = 'reviewed'
      )::bigint as reviewed_legacy_claim_count
    from claim_tracking ct
    group by ct.employee_id
  ),
  pending_agg as (
    select
      claim.employee_id,
      count(*)::bigint as pending_claim_count
    from public.phl_records claim
    where lower(coalesce(claim.source, '')) = 'employee_phl_claim'
      and lower(
        coalesce(
          nullif(claim.hr_status, ''),
          claim.status,
          ''
        )
      ) in ('pending', 'submitted', 'waiting_hr')
      and claim.employee_id is not null
    group by claim.employee_id
  ),
  latest_review as (
    select distinct on (pral.employee_id)
      pral.employee_id,
      pral.actor_email,
      pral.created_at,
      pral.note
    from public.phl_reconciliation_audit_logs pral
    where pral.action = 'employee_review'
      and pral.employee_id is not null
    order by pral.employee_id, pral.created_at desc
  )
  select
    e.id as employee_id,
    e.employee_number::text,
    e.full_name::text,
    e.department::text,
    e.position::text,
    e.phl_balance::numeric as manual_phl_balance,
    coalesce(sa.active_ledger_balance, 0)::numeric as active_ledger_balance,
    case
      when e.phl_balance is null then null
      else (
        e.phl_balance::numeric
        -
        coalesce(sa.active_ledger_balance, 0)::numeric
      )
    end as manual_ledger_difference,
    coalesce(sa.expired_remaining_balance, 0)::numeric as expired_remaining_balance,
    coalesce(sa.total_earned_days, 0)::numeric as total_earned_days,
    coalesce(sa.total_used_days, 0)::numeric as total_used_days,
    coalesce(pa.pending_claim_count, 0)::bigint as pending_claim_count,
    coalesce(ca.approved_claim_count, 0)::bigint as approved_claim_count,
    coalesce(ca.legacy_untracked_claim_count, 0)::bigint as legacy_untracked_claim_count,
    coalesce(ca.reviewed_legacy_claim_count, 0)::bigint as reviewed_legacy_claim_count,
    case
      when coalesce(ca.legacy_untracked_claim_count, 0) > 0
        then 'needs_review'
      when e.phl_balance is not null
        and abs(
          e.phl_balance::numeric
          -
          coalesce(sa.active_ledger_balance, 0)::numeric
        ) > 0.0001
        then 'manual_difference'
      else 'healthy'
    end::text as reconciliation_status,
    lr.actor_email::text as last_reviewed_by,
    lr.created_at as last_reviewed_at,
    lr.note::text as last_review_note
  from public.employees e
  left join source_agg sa
    on sa.employee_id = e.id
  left join claim_agg ca
    on ca.employee_id = e.id
  left join pending_agg pa
    on pa.employee_id = e.id
  left join latest_review lr
    on lr.employee_id = e.id
  where coalesce(e.is_active, true) = true
     or sa.employee_id is not null
     or ca.employee_id is not null
     or pa.employee_id is not null
  order by
    case
      when coalesce(ca.legacy_untracked_claim_count, 0) > 0 then 1
      when e.phl_balance is not null
        and abs(
          e.phl_balance::numeric
          -
          coalesce(sa.active_ledger_balance, 0)::numeric
        ) > 0.0001 then 2
      else 3
    end,
    e.full_name;
end;
$function$;


-- public.hr_mark_legacy_phl_claim_reviewed(p_claim_record_id uuid, p_note text)
CREATE OR REPLACE FUNCTION public.hr_mark_legacy_phl_claim_reviewed(p_claim_record_id uuid, p_note text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_claim public.phl_records%rowtype;
  v_actor_role text;
  v_actor_email text;
  v_note text;

  v_claim_days numeric(10, 2) := 0;
  v_allocated_days numeric(10, 2) := 0;
  v_override_consumed numeric(10, 2) := 0;
  v_tracking_gap numeric(10, 2) := 0;
begin
  if auth.uid() is null then
    raise exception 'Sesi login tidak ditemukan. Silakan login ulang.';
  end if;

  select
    lower(coalesce(au.role, '')),
    lower(coalesce(au.email, ''))
  into
    v_actor_role,
    v_actor_email
  from public.app_users au
  where au.id = auth.uid()
    and coalesce(au.is_active, true) = true
  limit 1;

  if not (
    coalesce(v_actor_role, '') like '%hr%'
    or coalesce(v_actor_role, '') like '%admin%'
  ) then
    raise exception 'Hanya akun HR/Admin aktif yang dapat mereview klaim legacy.';
  end if;

  v_note := btrim(coalesce(p_note, ''));

  if length(v_note) < 5 then
    raise exception 'Catatan review minimal 5 karakter.';
  end if;

  select *
  into v_claim
  from public.phl_records
  where id = p_claim_record_id
  for update;

  if not found then
    raise exception 'Klaim PHL tidak ditemukan.';
  end if;

  if lower(coalesce(v_claim.source, '')) <> 'employee_phl_claim' then
    raise exception 'Record ini bukan klaim PHL karyawan.';
  end if;

  if lower(coalesce(v_claim.status, '')) <> 'approved'
     and lower(coalesce(v_claim.hr_status, '')) <> 'approved' then
    raise exception 'Hanya klaim PHL approved yang dapat ditandai sebagai legacy review.';
  end if;

  v_claim_days := coalesce(
    nullif(v_claim.used_days, 0),
    nullif(v_claim.balance_days, 0),
    0
  );

  select coalesce(sum(pca.allocated_days), 0)::numeric
  into v_allocated_days
  from public.phl_claim_allocations pca
  where pca.claim_record_id = v_claim.id
    and pca.reversed_at is null;

  select
    greatest(
      coalesce(pcal.employee_override_before, 0)
      -
      coalesce(pcal.employee_override_after, 0),
      0
    )::numeric
  into v_override_consumed
  from public.phl_claim_audit_logs pcal
  where pcal.claim_record_id = v_claim.id
    and pcal.action = 'hr_approved'
  order by pcal.created_at desc
  limit 1;

  v_override_consumed := coalesce(v_override_consumed, 0);

  v_tracking_gap := abs(
    v_claim_days
    -
    (
      v_allocated_days
      +
      v_override_consumed
    )
  );

  if v_tracking_gap <= 0.0001 then
    raise exception 'Klaim ini sudah memiliki tracking saldo lengkap dan tidak termasuk klaim legacy.';
  end if;

  update public.phl_records
  set
    legacy_review_status = 'reviewed',
    legacy_review_note = v_note,
    legacy_reviewed_by = coalesce(
      nullif(v_actor_email, ''),
      'HR Administrator'
    ),
    legacy_reviewed_at = now(),
    updated_at = now()
  where id = v_claim.id;

  insert into public.phl_reconciliation_audit_logs (
    employee_id,
    claim_record_id,
    employee_number,
    full_name,
    action,
    active_ledger_balance,
    expired_remaining_balance,
    manual_phl_balance,
    manual_ledger_difference,
    tracking_gap_days,
    legacy_gap_count,
    actor_user_id,
    actor_email,
    note,
    metadata
  )
  values (
    v_claim.employee_id,
    v_claim.id,
    v_claim.employee_number,
    v_claim.full_name,
    'legacy_claim_reviewed',
    null,
    null,
    null,
    null,
    v_tracking_gap,
    1,
    auth.uid(),
    coalesce(nullif(v_actor_email, ''), 'HR Administrator'),
    v_note,
    jsonb_build_object(
      'claim_days', v_claim_days,
      'allocated_days', v_allocated_days,
      'override_consumed_days', v_override_consumed,
      'automatic_reversal_available', false,
      'balance_changed', false
    )
  );

  return jsonb_build_object(
    'success', true,
    'claim_record_id', v_claim.id,
    'claim_days', v_claim_days,
    'allocated_days', v_allocated_days,
    'override_consumed_days', v_override_consumed,
    'tracking_gap_days', v_tracking_gap,
    'message', 'Klaim legacy berhasil ditandai sudah direview. Saldo tidak diubah.'
  );
end;
$function$;


-- public.hr_record_phl_employee_review(p_employee_id uuid, p_note text)
CREATE OR REPLACE FUNCTION public.hr_record_phl_employee_review(p_employee_id uuid, p_note text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_employee public.employees%rowtype;
  v_actor_role text;
  v_actor_email text;
  v_note text;

  v_active_ledger numeric(10, 2) := 0;
  v_expired_remaining numeric(10, 2) := 0;
  v_difference numeric(10, 2) := null;
  v_legacy_gap_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Sesi login tidak ditemukan. Silakan login ulang.';
  end if;

  select
    lower(coalesce(au.role, '')),
    lower(coalesce(au.email, ''))
  into
    v_actor_role,
    v_actor_email
  from public.app_users au
  where au.id = auth.uid()
    and coalesce(au.is_active, true) = true
  limit 1;

  if not (
    coalesce(v_actor_role, '') like '%hr%'
    or coalesce(v_actor_role, '') like '%admin%'
  ) then
    raise exception 'Hanya akun HR/Admin aktif yang dapat mencatat review rekonsiliasi.';
  end if;

  v_note := btrim(coalesce(p_note, ''));

  if length(v_note) < 5 then
    raise exception 'Catatan review minimal 5 karakter.';
  end if;

  select *
  into v_employee
  from public.employees
  where id = p_employee_id
  for update;

  if not found then
    raise exception 'Data employee tidak ditemukan.';
  end if;

  select
    coalesce(
      sum(
        case
          when lower(coalesce(pr.status, '')) = 'approved'
            and coalesce(pr.remaining_days, 0) > 0
            and (
              pr.expired_at is null
              or pr.expired_at >= current_date
            )
          then coalesce(pr.remaining_days, 0)
          else 0
        end
      ),
      0
    )::numeric,
    coalesce(
      sum(
        case
          when lower(coalesce(pr.status, '')) = 'approved'
            and coalesce(pr.remaining_days, 0) > 0
            and pr.expired_at is not null
            and pr.expired_at < current_date
          then coalesce(pr.remaining_days, 0)
          else 0
        end
      ),
      0
    )::numeric
  into
    v_active_ledger,
    v_expired_remaining
  from public.phl_records pr
  where pr.employee_id = v_employee.id
    and lower(coalesce(pr.source, '')) = 'attendance_phl_approved';

  if v_employee.phl_balance is not null then
    v_difference := v_employee.phl_balance::numeric - v_active_ledger;
  end if;

  with tracking as (
    select
      claim.id,
      abs(
        coalesce(
          nullif(claim.used_days, 0),
          nullif(claim.balance_days, 0),
          0
        )::numeric
        -
        (
          coalesce(allocation_data.allocated_days, 0)::numeric
          +
          coalesce(approval_data.override_consumed_days, 0)::numeric
        )
      )::numeric as tracking_gap_days
    from public.phl_records claim
    left join lateral (
      select
        coalesce(sum(pca.allocated_days), 0)::numeric as allocated_days
      from public.phl_claim_allocations pca
      where pca.claim_record_id = claim.id
        and pca.reversed_at is null
    ) allocation_data on true
    left join lateral (
      select
        greatest(
          coalesce(pcal.employee_override_before, 0)
          -
          coalesce(pcal.employee_override_after, 0),
          0
        )::numeric as override_consumed_days
      from public.phl_claim_audit_logs pcal
      where pcal.claim_record_id = claim.id
        and pcal.action = 'hr_approved'
      order by pcal.created_at desc
      limit 1
    ) approval_data on true
    where claim.employee_id = v_employee.id
      and lower(coalesce(claim.source, '')) = 'employee_phl_claim'
      and (
        lower(coalesce(claim.status, '')) = 'approved'
        or lower(coalesce(claim.hr_status, '')) = 'approved'
      )
  )
  select count(*)::integer
  into v_legacy_gap_count
  from tracking
  where tracking_gap_days > 0.0001;

  insert into public.phl_reconciliation_audit_logs (
    employee_id,
    claim_record_id,
    employee_number,
    full_name,
    action,
    active_ledger_balance,
    expired_remaining_balance,
    manual_phl_balance,
    manual_ledger_difference,
    tracking_gap_days,
    legacy_gap_count,
    actor_user_id,
    actor_email,
    note,
    metadata
  )
  values (
    v_employee.id,
    null,
    v_employee.employee_number,
    v_employee.full_name,
    'employee_review',
    v_active_ledger,
    v_expired_remaining,
    v_employee.phl_balance,
    v_difference,
    null,
    v_legacy_gap_count,
    auth.uid(),
    coalesce(nullif(v_actor_email, ''), 'HR Administrator'),
    v_note,
    jsonb_build_object(
      'balance_changed', false,
      'review_only', true
    )
  );

  return jsonb_build_object(
    'success', true,
    'employee_id', v_employee.id,
    'active_ledger_balance', v_active_ledger,
    'expired_remaining_balance', v_expired_remaining,
    'manual_phl_balance', v_employee.phl_balance,
    'manual_ledger_difference', v_difference,
    'legacy_gap_count', v_legacy_gap_count,
    'message', 'Review rekonsiliasi PHL berhasil dicatat tanpa mengubah saldo.'
  );
end;
$function$;


-- public.hr_reject_phl_claim_atomic(p_claim_record_id uuid, p_rejected_by text, p_reason text)
CREATE OR REPLACE FUNCTION public.hr_reject_phl_claim_atomic(p_claim_record_id uuid, p_rejected_by text DEFAULT NULL::text, p_reason text DEFAULT 'Ditolak oleh HR.'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_claim_before public.phl_records%rowtype;
  v_claim_after public.phl_records%rowtype;

  v_actor_role text;
  v_actor_email text;
  v_rejected_by text;
  v_reject_reason text;
  v_legacy_message text;
  v_claim_days numeric(10, 2) := 0;
  v_available_balance numeric(10, 2) := 0;
  v_employee_override numeric(10, 2) := null;
begin
  if auth.uid() is null then
    raise exception 'Sesi login tidak ditemukan. Silakan login ulang.';
  end if;

  select
    lower(coalesce(au.role, '')),
    lower(coalesce(au.email, ''))
  into
    v_actor_role,
    v_actor_email
  from public.app_users au
  where au.id = auth.uid()
    and coalesce(au.is_active, true) = true
  limit 1;

  if not (
    coalesce(v_actor_role, '') like '%hr%'
    or coalesce(v_actor_role, '') like '%admin%'
  ) then
    raise exception 'Hanya akun HR/Admin aktif yang dapat menolak klaim PHL.';
  end if;

  v_rejected_by := coalesce(
    nullif(btrim(coalesce(p_rejected_by, '')), ''),
    nullif(v_actor_email, ''),
    'HR Administrator'
  );

  v_reject_reason := coalesce(
    nullif(btrim(coalesce(p_reason, '')), ''),
    'Ditolak oleh HR.'
  );

  if length(v_reject_reason) < 5 then
    raise exception 'Alasan penolakan minimal 5 karakter.';
  end if;

  select *
  into v_claim_before
  from public.phl_records
  where id = p_claim_record_id
  for update;

  if not found then
    raise exception 'Data klaim PHL tidak ditemukan.';
  end if;

  if lower(coalesce(v_claim_before.source, '')) <> 'employee_phl_claim' then
    raise exception 'Record ini bukan klaim PHL karyawan.';
  end if;

  if lower(coalesce(v_claim_before.status, '')) = 'rejected'
     or lower(coalesce(v_claim_before.hr_status, '')) = 'rejected' then
    return jsonb_build_object(
      'success', true,
      'already_rejected', true,
      'claim_record_id', v_claim_before.id,
      'employee_id', v_claim_before.employee_id,
      'message', 'Klaim PHL sebelumnya sudah ditolak.'
    );
  end if;

  if lower(coalesce(v_claim_before.status, '')) = 'approved'
     or lower(coalesce(v_claim_before.hr_status, '')) = 'approved' then
    raise exception 'Klaim PHL yang sudah approved tidak boleh langsung ditolak. Gunakan pembatalan.';
  end if;

  v_claim_days := coalesce(
    nullif(v_claim_before.used_days, 0),
    nullif(v_claim_before.balance_days, 0),
    0
  );

  select coalesce(sum(coalesce(pr.remaining_days, 0)), 0)
  into v_available_balance
  from public.phl_records pr
  where pr.employee_id = v_claim_before.employee_id
    and lower(coalesce(pr.source, '')) = 'attendance_phl_approved'
    and lower(coalesce(pr.status, '')) = 'approved'
    and coalesce(pr.remaining_days, 0) > 0
    and (
      pr.expired_at is null
      or pr.expired_at >= current_date
    );

  select e.phl_balance
  into v_employee_override
  from public.employees e
  where e.id = v_claim_before.employee_id;

  select public.reject_phl_claim(
    p_claim_record_id => v_claim_before.id,
    p_rejected_by => v_rejected_by,
    p_reason => v_reject_reason
  )::text
  into v_legacy_message;

  update public.phl_records
  set
    hr_note = v_reject_reason,
    updated_at = now()
  where id = v_claim_before.id;

  select *
  into v_claim_after
  from public.phl_records
  where id = v_claim_before.id;

  if not found then
    raise exception 'Klaim PHL hilang setelah proses penolakan.';
  end if;

  if lower(coalesce(v_claim_after.status, '')) <> 'rejected'
     and lower(coalesce(v_claim_after.hr_status, '')) <> 'rejected' then
    raise exception
      'Engine penolakan PHL tidak menghasilkan status rejected. Pesan engine: %',
      coalesce(v_legacy_message, '-');
  end if;

  insert into public.phl_claim_audit_logs (
    claim_record_id,
    employee_id,
    employee_number,
    full_name,
    action,
    claim_days,
    source,
    status_before,
    status_after,
    hr_status_before,
    hr_status_after,
    available_balance_before,
    available_balance_after,
    employee_override_before,
    employee_override_after,
    actor_user_id,
    actor_email,
    note,
    legacy_message,
    metadata
  )
  values (
    v_claim_before.id,
    v_claim_before.employee_id,
    v_claim_before.employee_number,
    v_claim_before.full_name,
    'hr_rejected',
    v_claim_days,
    v_claim_before.source,
    v_claim_before.status,
    v_claim_after.status,
    v_claim_before.hr_status,
    v_claim_after.hr_status,
    v_available_balance,
    v_available_balance,
    v_employee_override,
    v_employee_override,
    auth.uid(),
    v_rejected_by,
    v_reject_reason,
    v_legacy_message,
    jsonb_build_object(
      'phl_date', v_claim_before.phl_date,
      'supervisor_status', v_claim_before.supervisor_status,
      'balance_changed', false
    )
  );

  return jsonb_build_object(
    'success', true,
    'already_rejected', false,
    'claim_record_id', v_claim_after.id,
    'employee_id', v_claim_after.employee_id,
    'claim_days', v_claim_days,
    'legacy_message', v_legacy_message,
    'message', 'Klaim PHL berhasil ditolak secara atomik.'
  );
end;
$function$;


-- public.phl_get_effective_balance(p_employee_id uuid)
CREATE OR REPLACE FUNCTION public.phl_get_effective_balance(p_employee_id uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select (
    coalesce(
      (
        select sum(coalesce(pr.remaining_days, 0))
        from public.phl_records pr
        where pr.employee_id = p_employee_id
          and lower(coalesce(pr.source, '')) = 'attendance_phl_approved'
          and lower(coalesce(pr.status, '')) = 'approved'
          and coalesce(pr.remaining_days, 0) > 0
          and (
            pr.expired_at is null
            or pr.expired_at >= public.harmony_today_wita()
          )
      ),
      0
    )
    +
    coalesce(
      (
        select lb.remaining_days
        from public.phl_employee_legacy_balances lb
        where lb.employee_id = p_employee_id
      ),
      0
    )
  )::numeric;
$function$;


-- public.phl_get_effective_balance_v5(p_employee_id uuid)
CREATE OR REPLACE FUNCTION public.phl_get_effective_balance_v5(p_employee_id uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select (
    coalesce(
      (
        select sum(coalesce(pr.remaining_days, 0))
        from public.phl_records pr
        where pr.employee_id = p_employee_id
          and lower(coalesce(pr.source, '')) = 'attendance_phl_approved'
          and lower(coalesce(pr.status, '')) = 'approved'
          and coalesce(pr.remaining_days, 0) > 0
          and (pr.expired_at is null or pr.expired_at >= current_date)
      ),
      0
    )
    +
    coalesce(
      (
        select lb.remaining_days
        from public.phl_employee_legacy_balances lb
        where lb.employee_id = p_employee_id
      ),
      0
    )
  )::numeric;
$function$;


-- public.remed_cancel_claim_v1(p_claim_id uuid, p_actor_auth_user_id uuid, p_actor_email text, p_reason text)
CREATE OR REPLACE FUNCTION public.remed_cancel_claim_v1(p_claim_id uuid, p_actor_auth_user_id uuid, p_actor_email text, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_claim public.remed_claims%rowtype;
  v_access public.remed_user_access%rowtype;
begin
  select * into v_claim from public.remed_claims where id=p_claim_id for update;
  if not found then raise exception 'Klaim tidak ditemukan.'; end if;
  if v_claim.status <> 'pending_hr' then raise exception 'Hanya klaim yang masih menunggu HR yang dapat dibatalkan.'; end if;

  if p_actor_auth_user_id is not null then
    select * into v_access from public.remed_user_access where auth_user_id=p_actor_auth_user_id and is_active;
    if not found or v_access.role <> 'employee' or v_access.employee_id <> v_claim.employee_id then raise exception 'Akses pembatalan ditolak.'; end if;
  end if;

  if v_claim.affects_entitlement then
    update public.remed_entitlements
      set reserved_amount=greatest(0,reserved_amount-v_claim.submitted_amount)
      where employee_id=v_claim.employee_id and period_year=extract(year from v_claim.treatment_date)::integer;
  end if;
  update public.remed_claims set status='cancelled' where id=v_claim.id;
  insert into public.remed_status_logs(claim_id,from_status,to_status,actor_auth_user_id,actor_email,actor_role,note)
  values(v_claim.id,'pending_hr','cancelled',p_actor_auth_user_id,p_actor_email,case when p_actor_auth_user_id is null then 'system' else 'employee' end,p_reason);
end;
$function$;


-- public.remed_finance_review_claim_v1(p_claim_id uuid, p_decision text, p_note text, p_actor_auth_user_id uuid, p_actor_email text)
CREATE OR REPLACE FUNCTION public.remed_finance_review_claim_v1(p_claim_id uuid, p_decision text, p_note text, p_actor_auth_user_id uuid, p_actor_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_claim public.remed_claims%rowtype;
begin
  if not exists(select 1 from public.remed_user_access where auth_user_id=p_actor_auth_user_id and role='finance' and is_active) then raise exception 'Akses Finance Re-Med ditolak.'; end if;
  select * into v_claim from public.remed_claims where id=p_claim_id for update;
  if not found then raise exception 'Klaim tidak ditemukan.'; end if;
  if v_claim.status <> 'pending_finance' then raise exception 'Klaim sudah tidak berada pada antrean Finance.'; end if;

  if lower(p_decision)='approve' then
    update public.remed_claims set status='waiting_payment', finance_note=p_note, finance_reviewed_by=p_actor_auth_user_id, finance_reviewed_at=now() where id=v_claim.id;
    insert into public.remed_status_logs(claim_id,from_status,to_status,actor_auth_user_id,actor_email,actor_role,note) values(v_claim.id,'pending_finance','waiting_payment',p_actor_auth_user_id,p_actor_email,'finance',p_note);
  elsif lower(p_decision)='reject' then
    update public.remed_entitlements set reserved_amount=greatest(0,reserved_amount-coalesce(v_claim.approved_amount,v_claim.submitted_amount)) where employee_id=v_claim.employee_id and period_year=extract(year from v_claim.treatment_date)::integer;
    update public.remed_claims set status='rejected_finance', finance_note=p_note, finance_reviewed_by=p_actor_auth_user_id, finance_reviewed_at=now() where id=v_claim.id;
    insert into public.remed_status_logs(claim_id,from_status,to_status,actor_auth_user_id,actor_email,actor_role,note) values(v_claim.id,'pending_finance','rejected_finance',p_actor_auth_user_id,p_actor_email,'finance',p_note);
  else raise exception 'Keputusan Finance tidak valid.'; end if;
end;
$function$;


-- public.remed_hr_review_claim_v1(p_claim_id uuid, p_decision text, p_approved_amount numeric, p_note text, p_actor_auth_user_id uuid, p_actor_email text)
CREATE OR REPLACE FUNCTION public.remed_hr_review_claim_v1(p_claim_id uuid, p_decision text, p_approved_amount numeric, p_note text, p_actor_auth_user_id uuid, p_actor_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_claim public.remed_claims%rowtype;
  v_ent public.remed_entitlements%rowtype;
begin
  if not exists(select 1 from public.remed_user_access where auth_user_id=p_actor_auth_user_id and role='hr' and is_active) then raise exception 'Akses HR Re-Med ditolak.'; end if;
  select * into v_claim from public.remed_claims where id=p_claim_id for update;
  if not found then raise exception 'Klaim tidak ditemukan.'; end if;
  if v_claim.status <> 'pending_hr' then raise exception 'Klaim sudah tidak berada pada antrean HR.'; end if;
  select * into v_ent from public.remed_entitlements where employee_id=v_claim.employee_id and period_year=extract(year from v_claim.treatment_date)::integer for update;

  if lower(p_decision)='approve' then
    if p_approved_amount is null or p_approved_amount <= 0 or p_approved_amount > v_claim.submitted_amount then raise exception 'Nominal approved HR tidak valid.'; end if;
    update public.remed_entitlements set reserved_amount=greatest(0,reserved_amount-v_claim.submitted_amount+p_approved_amount) where id=v_ent.id;
    update public.remed_claims set status='pending_finance', approved_amount=p_approved_amount, hr_note=p_note, hr_reviewed_by=p_actor_auth_user_id, hr_reviewed_at=now() where id=v_claim.id;
    insert into public.remed_status_logs(claim_id,from_status,to_status,actor_auth_user_id,actor_email,actor_role,note) values(v_claim.id,'pending_hr','pending_finance',p_actor_auth_user_id,p_actor_email,'hr',p_note);
  elsif lower(p_decision)='reject' then
    update public.remed_entitlements set reserved_amount=greatest(0,reserved_amount-v_claim.submitted_amount) where id=v_ent.id;
    update public.remed_claims set status='rejected_hr', hr_note=p_note, hr_reviewed_by=p_actor_auth_user_id, hr_reviewed_at=now() where id=v_claim.id;
    insert into public.remed_status_logs(claim_id,from_status,to_status,actor_auth_user_id,actor_email,actor_role,note) values(v_claim.id,'pending_hr','rejected_hr',p_actor_auth_user_id,p_actor_email,'hr',p_note);
  else raise exception 'Keputusan HR tidak valid.'; end if;
end;
$function$;


-- public.remed_mark_claim_paid_v1(p_claim_id uuid, p_payment_date date, p_payment_reference text, p_payment_proof_path text, p_note text, p_actor_auth_user_id uuid, p_actor_email text)
CREATE OR REPLACE FUNCTION public.remed_mark_claim_paid_v1(p_claim_id uuid, p_payment_date date, p_payment_reference text, p_payment_proof_path text, p_note text, p_actor_auth_user_id uuid, p_actor_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_claim public.remed_claims%rowtype;
  v_amount numeric;
begin
  if not exists(select 1 from public.remed_user_access where auth_user_id=p_actor_auth_user_id and role='finance' and is_active) then raise exception 'Akses Finance Re-Med ditolak.'; end if;
  select * into v_claim from public.remed_claims where id=p_claim_id for update;
  if not found then raise exception 'Klaim tidak ditemukan.'; end if;
  if v_claim.status <> 'waiting_payment' then raise exception 'Klaim belum berada pada tahap pembayaran.'; end if;
  v_amount := coalesce(v_claim.approved_amount,v_claim.submitted_amount);

  update public.remed_entitlements
    set reserved_amount=greatest(0,reserved_amount-v_amount), current_used=current_used+v_amount
    where employee_id=v_claim.employee_id and period_year=extract(year from v_claim.treatment_date)::integer;
  update public.remed_claims set status='paid', payment_date=p_payment_date, payment_reference=p_payment_reference, payment_proof_path=p_payment_proof_path, finance_note=coalesce(p_note,finance_note) where id=v_claim.id;
  insert into public.remed_payment_logs(claim_id,amount,payment_date,payment_reference,payment_proof_path,actor_auth_user_id,actor_email,note)
  values(v_claim.id,v_amount,p_payment_date,p_payment_reference,p_payment_proof_path,p_actor_auth_user_id,p_actor_email,p_note);
  insert into public.remed_status_logs(claim_id,from_status,to_status,actor_auth_user_id,actor_email,actor_role,note) values(v_claim.id,'waiting_payment','paid',p_actor_auth_user_id,p_actor_email,'finance',p_note);
end;
$function$;


-- public.remed_next_claim_number()
CREATE OR REPLACE FUNCTION public.remed_next_claim_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_period text := to_char(now(), 'YYYYMM');
  v_next integer;
begin
  insert into public.remed_claim_sequences(period_key,last_value,updated_at)
  values(v_period,1,now())
  on conflict(period_key) do update
    set last_value = public.remed_claim_sequences.last_value + 1, updated_at=now()
  returning last_value into v_next;
  return 'RM-' || v_period || '-' || lpad(v_next::text,5,'0');
end;
$function$;


-- public.remed_set_entitlement_v1(p_employee_id uuid, p_period_year integer, p_plafond_total numeric, p_note text, p_actor_auth_user_id uuid, p_actor_email text)
CREATE OR REPLACE FUNCTION public.remed_set_entitlement_v1(p_employee_id uuid, p_period_year integer, p_plafond_total numeric, p_note text, p_actor_auth_user_id uuid, p_actor_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_used numeric := 0;
begin
  if not exists(select 1 from public.remed_user_access where auth_user_id=p_actor_auth_user_id and role='hr' and is_active) then raise exception 'Akses HR Re-Med ditolak.'; end if;
  select coalesce(legacy_used,0)+coalesce(current_used,0)+coalesce(reserved_amount,0) into v_used from public.remed_entitlements where employee_id=p_employee_id and period_year=p_period_year;
  if found and p_plafond_total < v_used then raise exception 'Plafond tidak boleh lebih kecil dari nilai yang sudah terpakai/terreservasi.'; end if;
  insert into public.remed_entitlements(employee_id,period_year,plafond_total,note) values(p_employee_id,p_period_year,p_plafond_total,p_note)
  on conflict(employee_id,period_year) do update set plafond_total=excluded.plafond_total, note=excluded.note;
  insert into public.remed_audit_logs(actor_auth_user_id,actor_email,actor_role,action,entity_type,entity_id,metadata)
  values(p_actor_auth_user_id,p_actor_email,'hr','entitlement_updated','employee',p_employee_id,jsonb_build_object('year',p_period_year,'plafond_total',p_plafond_total,'note',p_note));
end;
$function$;


-- public.remed_submit_claim_v1(p_employee_id uuid, p_claim_type_id uuid, p_treatment_date date, p_provider_name text, p_submitted_amount numeric, p_employee_note text, p_bank_name text, p_bank_account_number text, p_bank_account_name text, p_actor_auth_user_id uuid, p_actor_email text)
CREATE OR REPLACE FUNCTION public.remed_submit_claim_v1(p_employee_id uuid, p_claim_type_id uuid, p_treatment_date date, p_provider_name text, p_submitted_amount numeric, p_employee_note text, p_bank_name text, p_bank_account_number text, p_bank_account_name text, p_actor_auth_user_id uuid, p_actor_email text)
 RETURNS TABLE(claim_id uuid, claim_number text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_ent public.remed_entitlements%rowtype;
  v_claim_id uuid;
  v_claim_number text;
  v_available numeric;
  v_year integer := extract(year from p_treatment_date)::integer;
begin
  if p_submitted_amount is null or p_submitted_amount <= 0 then raise exception 'Nominal klaim harus lebih dari 0.'; end if;
  if not exists(select 1 from public.remed_user_access a where a.auth_user_id=p_actor_auth_user_id and a.employee_id=p_employee_id and a.role='employee' and a.is_active) then
    raise exception 'Akun employee tidak berhak membuat klaim untuk employee ini.';
  end if;
  if not exists(select 1 from public.remed_claim_types t where t.id=p_claim_type_id and t.is_active) then raise exception 'Jenis klaim tidak aktif.'; end if;

  select * into v_ent from public.remed_entitlements where employee_id=p_employee_id and period_year=v_year for update;
  if not found then raise exception 'Plafond tahun % belum diatur oleh HR.', v_year; end if;
  v_available := v_ent.plafond_total-v_ent.legacy_used-v_ent.current_used-v_ent.reserved_amount;
  if p_submitted_amount > v_available then raise exception 'Nominal melebihi sisa plafond tersedia.'; end if;

  v_claim_number := public.remed_next_claim_number();
  insert into public.remed_claims(claim_number,employee_id,claim_type_id,treatment_date,provider_name,submitted_amount,employee_note,status,bank_name,bank_account_number,bank_account_name)
  values(v_claim_number,p_employee_id,p_claim_type_id,p_treatment_date,nullif(trim(p_provider_name),''),p_submitted_amount,nullif(trim(p_employee_note),''),'pending_hr',trim(p_bank_name),trim(p_bank_account_number),trim(p_bank_account_name))
  returning id into v_claim_id;

  update public.remed_entitlements set reserved_amount=reserved_amount+p_submitted_amount where id=v_ent.id;
  insert into public.remed_status_logs(claim_id,from_status,to_status,actor_auth_user_id,actor_email,actor_role,note)
  values(v_claim_id,null,'pending_hr',p_actor_auth_user_id,p_actor_email,'employee','Pengajuan reimbursement dibuat.');
  insert into public.remed_audit_logs(actor_auth_user_id,actor_email,actor_role,action,entity_type,entity_id,metadata)
  values(p_actor_auth_user_id,p_actor_email,'employee','claim_submitted','remed_claim',v_claim_id,jsonb_build_object('amount',p_submitted_amount));

  return query select v_claim_id, v_claim_number;
end;
$function$;



-- Keep the helper RPC compatible with the V2 source even after rollback.
create or replace function public.remed_write_audit_v1(
  p_actor_auth_user_id uuid,
  p_actor_email text,
  p_actor_role text,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $remed_audit$
begin
  insert into public.remed_audit_logs(
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
    nullif(btrim(coalesce(p_actor_email, '')), ''),
    nullif(btrim(coalesce(p_actor_role, '')), ''),
    btrim(p_action),
    coalesce(nullif(btrim(coalesce(p_entity_type, '')), ''), 'unknown'),
    p_entity_id,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$remed_audit$;

revoke all on function public.remed_write_audit_v1(uuid,text,text,text,text,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.remed_write_audit_v1(uuid,text,text,text,text,uuid,jsonb) to service_role;

commit;

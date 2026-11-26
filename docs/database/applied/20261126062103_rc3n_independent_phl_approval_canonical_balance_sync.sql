DO $rc3n_phl_work$
DECLARE
 sig regprocedure:='public.harmony_review_phl_work_request_v1(uuid,text,uuid,text,text,text)'::regprocedure;
 olddef text; newdef text; f pg_proc%ROWTYPE;
 mark_replay constant text:='if v_request.status = ''approved'' and v_action = ''approve'' then';
 mark_fresh constant text:='where id = v_request.attendance_log_id;';
BEGIN
 PERFORM set_config('lock_timeout','5s',true);
 PERFORM set_config('statement_timeout','30000ms',true);
 f:=(SELECT p FROM pg_proc p WHERE p.oid=sig);
 olddef:=pg_get_functiondef(sig);
 IF current_user<>'postgres' OR md5(olddef)<>'7cc20e8f70d29fa9aac27c024d67a1b8' OR f.proowner<>'postgres'::regrole OR NOT f.prosecdef OR f.proacl::text<>'{postgres=X/postgres,service_role=X/postgres}' OR has_function_privilege('authenticated',sig,'EXECUTE') OR has_function_privilege('anon',sig,'EXECUTE') OR has_function_privilege('authenticated','public.phl_sync_employee_effective_balance(uuid)','EXECUTE') THEN RAISE EXCEPTION 'PHL approval baseline changed'; END IF;
 IF length(olddef)-length(replace(olddef,mark_replay,''))<>length(mark_replay) OR length(olddef)-length(replace(olddef,mark_fresh,''))<>length(mark_fresh) OR strpos(olddef,'(v_request.work_date + 90) < current_date')=0 THEN RAISE EXCEPTION 'Patch anchor mismatch'; END IF;
 newdef:=replace(replace(replace(olddef,mark_replay,mark_replay||E'\n    -- Reconcile the derived employee balance on a valid replay; no extra credit.\n    if exists (select 1 from public.phl_records pr where pr.id=v_request.credited_phl_record_id and pr.employee_id=v_request.employee_id and pr.source=''attendance_phl_approved'' and pr.status=''approved'') then\n      perform 1 from public.employees e where e.id=v_request.employee_id for update;\n      if exists(select 1 from public.employees e where e.id=v_request.employee_id and e.phl_balance is distinct from public.phl_get_effective_balance(e.id)) then\n        perform public.phl_sync_employee_effective_balance(v_request.employee_id);\n      end if;\n    end if;'),mark_fresh,mark_fresh||E'\n\n  -- The earned ledger is authoritative. Update its derived mirror in this transaction.\n  perform 1 from public.employees e where e.id=v_request.employee_id for update;\n  if not found then raise exception ''Employee for PHL approval not found''; end if;\n  perform public.phl_sync_employee_effective_balance(v_request.employee_id);'),'(v_request.work_date + 90) < current_date','(v_request.work_date + 90) < public.harmony_today_wita()');
 EXECUTE newdef;
 IF (SELECT proacl::text FROM pg_proc WHERE oid=sig)<>f.proacl::text OR (SELECT NOT prosecdef OR proowner<>'postgres'::regrole FROM pg_proc WHERE oid=sig) OR (SELECT strpos(prosrc,'perform public.phl_sync_employee_effective_balance(v_request.employee_id);') FROM pg_proc WHERE oid=sig)=0 THEN RAISE EXCEPTION 'Patch verification failed'; END IF;
 IF EXISTS(SELECT 1 FROM public.employees e LEFT JOIN public.harmony_leave_balance_summary s ON s.employee_id=e.id WHERE e.is_active IS DISTINCT FROM false AND (s.employee_id IS NULL OR e.annual_leave_balance IS DISTINCT FROM s.annual_total_available_days OR e.phl_balance IS DISTINCT FROM public.phl_get_effective_balance(e.id))) THEN RAISE EXCEPTION 'Balance baseline changed: stop and inspect'; END IF;
END;
$rc3n_phl_work$;

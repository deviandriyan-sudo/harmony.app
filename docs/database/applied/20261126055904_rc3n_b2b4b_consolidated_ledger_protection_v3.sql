DO $b4b$
DECLARE
 t record; c pg_class%ROWTYPE; f pg_proc%ROWTYPE; sig text; olddef text; newdef text; argdecl text; fn text;
 full_acl constant text := '{postgres=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}';
 func_acl constant text := '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}';
 profile_guard constant text := 'harmony_internal.rc3n_b2b4_guard_master()';
BEGIN
 PERFORM set_config('lock_timeout','5s',true);
 PERFORM set_config('statement_timeout','45000ms',true);
 PERFORM set_config('search_path','pg_catalog,public,pg_temp',true);
 IF current_user<>'postgres' OR has_schema_privilege('authenticated','public','CREATE') OR has_schema_privilege('authenticated','harmony_internal','CREATE') OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.app_users'::regclass) OR has_column_privilege('authenticated','public.app_users','role','UPDATE') OR has_column_privilege('authenticated','public.app_users','employee_id','UPDATE') OR (SELECT md5(prosrc) FROM pg_proc WHERE oid=to_regprocedure(profile_guard)) IS DISTINCT FROM 'c42ad17bfdd92d11a70cb3a8df86bae5' OR (SELECT count(*) FROM pg_trigger WHERE tgrelid IN ('public.employees'::regclass,'public.employee_assignments'::regclass) AND tgfoid=to_regprocedure(profile_guard) AND tgtype=31 AND tgenabled='O')<>2 THEN RAISE EXCEPTION 'B2 prerequisites failed'; END IF;
 FOREACH fn IN ARRAY ARRAY['employee_annual_leave_balances','employee_annual_leave_transactions','employee_phl_usage_transactions','annual_leave_cycles','annual_leave_employee_adjustments','phl_records','leave_requests','holidays'] LOOP
  c:=(SELECT x FROM pg_class x WHERE x.oid=to_regclass('public.'||fn));
  IF c.oid IS NULL OR c.relowner<>'postgres'::regrole OR c.relacl::text IS DISTINCT FROM (CASE WHEN fn='annual_leave_cycles' THEN '{postgres=arwdDxtm/postgres,authenticated=rDxtm/postgres,service_role=arwdDxtm/postgres}' ELSE full_acl END) OR EXISTS(SELECT 1 FROM pg_attribute a CROSS JOIN LATERAL aclexplode(a.attacl) g WHERE a.attrelid=c.oid AND g.grantee IN (0,'authenticated'::regrole,'anon'::regrole)) THEN RAISE EXCEPTION 'Table ACL baseline changed: %',fn; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.holidays'::regclass AND NOT tgisinternal) OR to_regprocedure('harmony_internal.rc3n_b2b4_guard_leave_insert()') IS NOT NULL THEN RAISE EXCEPTION 'Trigger baseline changed'; END IF;
 FOR t IN SELECT * FROM (VALUES ('approve_leave_request_by_supervisor','cd1ed6b783500c9cb99c6f8a18f2e7ac'),('reject_leave_request_by_supervisor','036f996a7fe6396fd857193c6cc06832')) v(name,digest) LOOP
  sig:='public.'||t.name||'(uuid,uuid,text,text)';
  f:=(SELECT x FROM pg_proc x WHERE x.oid=to_regprocedure(sig));
  IF f.oid IS NULL OR f.proowner<>'postgres'::regrole OR f.prosecdef OR f.proacl::text IS DISTINCT FROM func_acl OR md5(pg_get_functiondef(f.oid)) IS DISTINCT FROM t.digest OR to_regprocedure('harmony_internal.'||t.name||'(uuid,uuid,text,text)') IS NOT NULL OR EXISTS(SELECT 1 FROM pg_depend WHERE refclassid='pg_proc'::regclass AND refobjid=f.oid) THEN RAISE EXCEPTION 'Supervisor baseline changed: %',sig; END IF;
  IF strpos(f.prosrc,'v_actor_identifiers := array_remove(ARRAY[')=0 THEN RAISE EXCEPTION 'Actor attribution marker absent'; END IF;
  olddef:=pg_get_functiondef(f.oid);
  newdef:=replace(olddef,'v_actor_identifiers := array_remove(ARRAY[','p_supervisor_name := v_actor.full_name; v_actor_identifiers := array_remove(ARRAY[');
  IF newdef=olddef THEN RAISE EXCEPTION 'Actor attribution patch failed'; END IF;
  EXECUTE newdef;
  EXECUTE format('ALTER FUNCTION %s SET SCHEMA harmony_internal',sig);
  sig:='harmony_internal.'||t.name||'(uuid,uuid,text,text)';
  EXECUTE format('ALTER FUNCTION %s SECURITY DEFINER',sig);
  EXECUTE format('ALTER FUNCTION %s SET search_path TO pg_catalog, public, pg_temp',sig);
  argdecl:='p_request_id uuid, p_supervisor_id uuid, p_supervisor_name text, p_note text'||CASE WHEN t.name='approve_leave_request_by_supervisor' THEN ' DEFAULT NULL::text' ELSE '' END;
  EXECUTE format('CREATE FUNCTION public.%I(%s) RETURNS text LANGUAGE sql SECURITY INVOKER SET search_path TO pg_catalog, pg_temp AS %L',t.name,argdecl,format('SELECT harmony_internal.%I($1,$2,$3,$4)',t.name));
  sig:='public.'||t.name||'(uuid,uuid,text,text)';
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role',sig);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role',sig);
  IF has_function_privilege('anon',sig,'EXECUTE') OR NOT has_function_privilege('authenticated',sig,'EXECUTE') THEN RAISE EXCEPTION 'Public wrapper ACL failed'; END IF;
 END LOOP;
 FOR t IN SELECT * FROM (VALUES
 ('use_employee_annual_leave_balance(uuid,uuid,numeric,text,text,text)','89a1fc7314fd93f11f25c6b09ef9865f'),
 ('use_employee_phl_balance(uuid,uuid,numeric,text,text,text)','9da694c0c06d426b6b43b88e4684cf78'),
 ('rollback_employee_annual_leave_usage(uuid,text,text,text)','feb649d9f5e7c8aa7016dc6dc5ecd246'),
 ('rollback_employee_phl_usage(uuid,text,text,text)','469bdf52956fdeac4077a02a8b10f3d6'),
 ('sync_employee_annual_leave_balance(uuid,date)','fecb9288c8e03d1d2a24c98f1b7fee1b'),
 ('sync_phl_balance_from_attendance(uuid,date,date)','1c5496c420aaec1f0254385c6546c915')) v(name,digest) LOOP
  sig:='public.'||t.name; f:=(SELECT x FROM pg_proc x WHERE x.oid=to_regprocedure(sig));
  IF f.oid IS NULL OR f.proowner<>'postgres'::regrole OR f.proacl::text IS DISTINCT FROM func_acl OR md5(pg_get_functiondef(f.oid)) IS DISTINCT FROM t.digest THEN RAISE EXCEPTION 'Debit/refund baseline changed: %',sig; END IF;
  EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated',sig);
  IF has_function_privilege('authenticated',sig,'EXECUTE') OR has_function_privilege('anon',sig,'EXECUTE') OR NOT has_function_privilege('service_role',sig,'EXECUTE') THEN RAISE EXCEPTION 'RPC ACL failed: %',sig; END IF;
 END LOOP;
 FOREACH fn IN ARRAY ARRAY['employee_annual_leave_balances','employee_annual_leave_transactions','employee_phl_usage_transactions','annual_leave_cycles','annual_leave_employee_adjustments','phl_records','leave_requests'] LOOP
  EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public.%I FROM authenticated',fn);
  IF has_table_privilege('authenticated','public.'||fn,'INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES,MAINTAIN') OR NOT has_table_privilege('service_role','public.'||fn,'INSERT,UPDATE,DELETE') THEN RAISE EXCEPTION 'Ledger ACL failed: %',fn; END IF;
 END LOOP;
 GRANT INSERT (employee_id,employee_number,machine_pin,full_name,department,position,email,request_category,leave_type,request_type,start_date,end_date,total_days,reason,job_pending,handover_to,handover_to_employee_id,handover_to_employee_number,handover_to_full_name,handover_to_department,handover_to_position,handover_note,proof_file_url,proof_file_name,proof_file_size,proof_file_type,status,supervisor_status,supervisor_id,supervisor_name,hr_status,source,is_locked,updated_at,created_at) ON public.leave_requests TO authenticated;
 EXECUTE format('CREATE FUNCTION harmony_internal.rc3n_b2b4_guard_leave_insert() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO pg_catalog,public,pg_temp AS %L', 'DECLARE expected_days integer; BEGIN IF current_user IN (''postgres'',''service_role'') THEN RETURN NEW; END IF; IF current_user<>''authenticated'' OR NOT EXISTS(SELECT 1 FROM public.app_users a JOIN public.employees e ON e.id=a.employee_id WHERE a.id=auth.uid() AND a.employee_id=NEW.employee_id AND a.is_active IS DISTINCT FROM false AND e.is_active IS DISTINCT FROM false) OR NEW.status IS DISTINCT FROM ''pending'' OR NEW.supervisor_status IS DISTINCT FROM ''pending'' OR NEW.hr_status IS DISTINCT FROM ''pending'' OR NEW.source IS DISTINCT FROM ''employee_self_service'' OR NEW.is_locked IS DISTINCT FROM false OR NEW.request_type IS NULL OR NEW.request_type=''phl_claim'' OR NEW.start_date IS NULL OR NEW.end_date IS NULL OR NEW.end_date-NEW.start_date NOT BETWEEN 0 AND 3660 THEN RAISE EXCEPTION USING ERRCODE=''42501'',MESSAGE=''RC3N: invalid direct leave submission''; END IF; expected_days:=(SELECT count(*) FROM generate_series(NEW.start_date,NEW.end_date,interval ''1 day'') d WHERE extract(isodow FROM d) BETWEEN 1 AND 5 AND NOT EXISTS(SELECT 1 FROM public.holidays h WHERE h.is_active IS DISTINCT FROM false AND public.harmony_safe_date(h.holiday_date::text)=d::date)); IF expected_days<=0 OR NEW.total_days IS DISTINCT FROM expected_days::numeric THEN RAISE EXCEPTION USING ERRCODE=''42501'',MESSAGE=''RC3N: invalid leave day count''; END IF; RETURN NEW; END;');
 REVOKE ALL ON FUNCTION harmony_internal.rc3n_b2b4_guard_leave_insert() FROM PUBLIC, anon, authenticated, service_role;
 CREATE TRIGGER rc3n_b2b4_leave_insert_guard BEFORE INSERT ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION harmony_internal.rc3n_b2b4_guard_leave_insert();
 CREATE TRIGGER rc3n_b2b4_master_write_guard BEFORE INSERT OR UPDATE OR DELETE ON public.holidays FOR EACH ROW EXECUTE FUNCTION harmony_internal.rc3n_b2b4_guard_master();
 REVOKE TRUNCATE, TRIGGER ON public.holidays FROM authenticated;
 IF (SELECT count(*) FROM pg_trigger WHERE (tgrelid='public.leave_requests'::regclass AND tgname='rc3n_b2b4_leave_insert_guard' AND tgtype=7 AND tgfoid='harmony_internal.rc3n_b2b4_guard_leave_insert()'::regprocedure OR tgrelid='public.holidays'::regclass AND tgname='rc3n_b2b4_master_write_guard' AND tgtype=31 AND tgfoid=to_regprocedure(profile_guard)) AND tgenabled='O')<>2 THEN RAISE EXCEPTION 'Trigger verification failed'; END IF;
 IF EXISTS(SELECT 1 FROM public.employees e LEFT JOIN public.harmony_leave_balance_summary s ON s.employee_id=e.id WHERE e.is_active IS DISTINCT FROM false AND (s.employee_id IS NULL OR e.annual_leave_balance IS DISTINCT FROM s.annual_total_available_days OR e.phl_balance IS DISTINCT FROM public.phl_get_effective_balance(e.id))) THEN RAISE EXCEPTION 'Balance verification failed'; END IF;
 FOR t IN EXECUTE '-- RC3N-B2B4B V3 read-only postcheck. Every row must return PASS after APPLY.
WITH rpc_targets(signature,digest) AS (VALUES
 (''public.use_employee_annual_leave_balance(uuid,uuid,numeric,text,text,text)'',''89a1fc7314fd93f11f25c6b09ef9865f''),
 (''public.use_employee_phl_balance(uuid,uuid,numeric,text,text,text)'',''9da694c0c06d426b6b43b88e4684cf78''),
 (''public.rollback_employee_annual_leave_usage(uuid,text,text,text)'',''feb649d9f5e7c8aa7016dc6dc5ecd246''),
 (''public.rollback_employee_phl_usage(uuid,text,text,text)'',''469bdf52956fdeac4077a02a8b10f3d6''),
 (''public.sync_employee_annual_leave_balance(uuid,date)'',''fecb9288c8e03d1d2a24c98f1b7fee1b''),
 (''public.sync_phl_balance_from_attendance(uuid,date,date)'',''1c5496c420aaec1f0254385c6546c915'')
), supervisor_targets(name,digest) AS (VALUES
 (''approve_leave_request_by_supervisor'',''4007728b0ec6a826a1abd4a07f3c87c0''),
 (''reject_leave_request_by_supervisor'',''f4a506b59f0f5ba1bbc17943e3536b5c'')
), table_targets(name) AS (VALUES
 (''employee_annual_leave_balances''),(''employee_annual_leave_transactions''),(''employee_phl_usage_transactions''),(''annual_leave_cycles''),(''annual_leave_employee_adjustments''),(''phl_records''),(''leave_requests'')
), checks AS (
 SELECT ''RPC: ''||t.signature AS check_name,
 p.oid IS NOT NULL AND md5(pg_get_functiondef(p.oid))=t.digest AND NOT has_function_privilege(''authenticated'',p.oid,''EXECUTE'') AND NOT has_function_privilege(''anon'',p.oid,''EXECUTE'') AND has_function_privilege(''service_role'',p.oid,''EXECUTE'') AS ok
 FROM rpc_targets t LEFT JOIN pg_proc p ON p.oid=to_regprocedure(t.signature)
 UNION ALL
 SELECT ''Supervisor: ''||t.name,
 w.oid IS NOT NULL AND i.oid IS NOT NULL AND NOT w.prosecdef AND i.prosecdef AND i.proowner=''postgres''::regrole AND md5(i.prosrc)=t.digest
 AND w.prosrc=format(''SELECT harmony_internal.%I($1,$2,$3,$4)'',t.name)
 AND ''search_path=pg_catalog, pg_temp''=ANY(w.proconfig) AND ''search_path=pg_catalog, public, pg_temp''=ANY(i.proconfig)
 AND has_function_privilege(''authenticated'',w.oid,''EXECUTE'') AND has_function_privilege(''authenticated'',i.oid,''EXECUTE'') AND NOT has_function_privilege(''anon'',w.oid,''EXECUTE'') AND NOT has_function_privilege(''anon'',i.oid,''EXECUTE'')
 FROM supervisor_targets t LEFT JOIN pg_proc w ON w.oid=to_regprocedure(''public.''||t.name||''(uuid,uuid,text,text)'') LEFT JOIN pg_proc i ON i.oid=to_regprocedure(''harmony_internal.''||t.name||''(uuid,uuid,text,text)'')
 UNION ALL
 SELECT ''Table: ''||t.name,
 c.oid IS NOT NULL AND NOT has_table_privilege(''authenticated'',c.oid,''INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES,MAINTAIN'')
 AND NOT has_any_column_privilege(''authenticated'',c.oid,''UPDATE,REFERENCES'')
 AND (CASE WHEN t.name=''leave_requests'' THEN
 ARRAY(SELECT a.attname::text FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped AND has_column_privilege(''authenticated'',c.oid,a.attnum,''INSERT'') ORDER BY a.attname::text COLLATE "C")=ARRAY[''created_at'',''department'',''email'',''employee_id'',''employee_number'',''end_date'',''full_name'',''handover_note'',''handover_to'',''handover_to_department'',''handover_to_employee_id'',''handover_to_employee_number'',''handover_to_full_name'',''handover_to_position'',''hr_status'',''is_locked'',''job_pending'',''leave_type'',''machine_pin'',''position'',''proof_file_name'',''proof_file_size'',''proof_file_type'',''proof_file_url'',''reason'',''request_category'',''request_type'',''source'',''start_date'',''status'',''supervisor_id'',''supervisor_name'',''supervisor_status'',''total_days'',''updated_at'']::text[]
 ELSE NOT has_any_column_privilege(''authenticated'',c.oid,''INSERT'') END)
 AND NOT has_table_privilege(''anon'',c.oid,''SELECT,INSERT,UPDATE,DELETE'') AND has_table_privilege(''authenticated'',c.oid,''SELECT'')
 AND has_table_privilege(''service_role'',c.oid,''INSERT'') AND has_table_privilege(''service_role'',c.oid,''UPDATE'') AND has_table_privilege(''service_role'',c.oid,''DELETE'')
 FROM table_targets t LEFT JOIN pg_class c ON c.oid=to_regclass(''public.''||t.name)
 UNION ALL
 SELECT ''Leave insert guard'', EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid WHERE t.tgrelid=''public.leave_requests''::regclass AND t.tgname=''rc3n_b2b4_leave_insert_guard'' AND t.tgtype=7 AND t.tgenabled=''O'' AND p.oid=to_regprocedure(''harmony_internal.rc3n_b2b4_guard_leave_insert()'') AND NOT p.prosecdef AND p.proowner=''postgres''::regrole AND NOT has_function_privilege(''anon'',p.oid,''EXECUTE'') AND NOT has_function_privilege(''authenticated'',p.oid,''EXECUTE''))
 UNION ALL
 SELECT ''Holiday master guard'', EXISTS(SELECT 1 FROM pg_trigger t WHERE t.tgrelid=''public.holidays''::regclass AND t.tgname=''rc3n_b2b4_master_write_guard'' AND t.tgtype=31 AND t.tgenabled=''O'' AND t.tgfoid=to_regprocedure(''harmony_internal.rc3n_b2b4_guard_master()'')) AND NOT has_table_privilege(''authenticated'',''public.holidays'',''TRUNCATE,TRIGGER'')
 UNION ALL
 SELECT ''Synthetic requests remaining'', NOT EXISTS(SELECT 1 FROM public.leave_requests WHERE reason LIKE ''RC3N rollback-only QA%'')
 UNION ALL
 SELECT ''Annual/PHL balance consistency'', count(*)>0 AND count(*) FILTER(WHERE e.annual_leave_balance IS DISTINCT FROM s.annual_total_available_days OR e.phl_balance IS DISTINCT FROM public.phl_get_effective_balance(e.id) OR s.employee_id IS NULL)=0
 FROM public.employees e LEFT JOIN public.harmony_leave_balance_summary s ON s.employee_id=e.id WHERE e.is_active IS DISTINCT FROM false
 UNION ALL
 SELECT ''Anonymous RPC access'', NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.pronamespace=''public''::regnamespace AND p.prokind=''f'' AND has_function_privilege(''anon'',p.oid,''EXECUTE''))
)
SELECT check_name,CASE WHEN ok THEN ''PASS'' ELSE ''BLOCK'' END AS validation FROM checks ORDER BY check_name' LOOP IF t.validation <> 'PASS' THEN RAISE EXCEPTION 'Postcheck failed: %',t.check_name; END IF; END LOOP;
 RAISE NOTICE 'RC3N-B2B4B V3 APPLIED - ALL POSTCHECKS PASS';
END;
$b4b$;

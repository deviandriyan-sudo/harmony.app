DO $rc3n_c_archive$
DECLARE t record; c pg_class%ROWTYPE;
BEGIN
 PERFORM set_config('lock_timeout','5s',true);
 PERFORM set_config('statement_timeout','15000ms',true);
 IF current_user<>'postgres' THEN RAISE EXCEPTION 'Unexpected migration owner'; END IF;
 FOR t IN SELECT * FROM (VALUES ('attendance_logs_backup_pin_repair_20260615','r'),('harmony_v8_legacy_phl_migration_audit','v')) v(name,kind) LOOP
 c:=(SELECT p FROM pg_class p WHERE p.oid=to_regclass('public.'||t.name));
 IF c.oid IS NULL OR c.relkind::text<>t.kind OR c.relowner<>'postgres'::regrole OR c.relacl::text IS DISTINCT FROM '{postgres=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}' OR c.relrowsecurity OR EXISTS(SELECT 1 FROM pg_attribute a CROSS JOIN LATERAL aclexplode(a.attacl) g WHERE a.attrelid=c.oid AND g.grantee IN (0,'authenticated'::regrole,'anon'::regrole)) OR EXISTS(SELECT 1 FROM pg_depend d JOIN pg_rewrite rw ON d.classid='pg_rewrite'::regclass AND rw.oid=d.objid WHERE d.refclassid='pg_class'::regclass AND d.refobjid=c.oid AND rw.ev_class<>c.oid) OR EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','harmony_internal','harmony_audit') AND p.prokind='f' AND strpos(lower(p.prosrc),lower(t.name))>0) THEN RAISE EXCEPTION 'Archive baseline changed: %',t.name; END IF;
 EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM authenticated',t.name);
 IF t.kind='r' THEN EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t.name); END IF;
 IF has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') OR has_any_column_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,REFERENCES') OR has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') OR NOT has_table_privilege('service_role',c.oid,'SELECT') OR (SELECT relrowsecurity FROM pg_class WHERE oid=c.oid) IS DISTINCT FROM (t.kind='r') THEN RAISE EXCEPTION 'Archive postcheck failed: %',t.name; END IF;
 END LOOP;
END;
$rc3n_c_archive$;

-- LEGACY RE-MED BOOTSTRAP MIGRATION - DISABLED AFTER DATABASE COMPACT V2
-- The Re-Med V1 migration has already been applied to the live HARMONY database.
-- Re-running the old bootstrap after Compact V2 would recreate technical tables in public.
-- Use HARMONY_DATABASE_COMPACT_V2_MIGRATION.sql for the current database upgrade.

do $$
begin
  raise exception 'STOP: HARMONY_REMED_V1_MIGRATION.sql is legacy and disabled after Compact V2. Run HARMONY_DATABASE_COMPACT_V2_MIGRATION.sql instead.';
end
$$;

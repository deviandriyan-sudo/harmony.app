-- HARMONY + RE-MED V2.4
-- ROLLBACK: removes only the new purge RPC.
-- NOTE: history rows already purged by an HR action cannot be recreated by this rollback.

drop function if exists public.remed_purge_deleted_claim_history_v3(uuid,uuid,text,text);

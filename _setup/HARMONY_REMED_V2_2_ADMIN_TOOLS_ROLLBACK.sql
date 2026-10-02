-- HARMONY + RE-MED V2.2 ROLLBACK
-- Removes only the two V2.2 RPCs. No business rows are changed.
begin;
drop function if exists public.remed_get_process_history_v2(uuid,integer);
drop function if exists public.remed_delete_claim_v2(uuid,uuid,text,text);
commit;

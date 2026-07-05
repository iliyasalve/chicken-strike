-- Least-privilege cleanup (Supabase advisor 0028/0029).
-- rls_auto_enable() is a SECURITY DEFINER *event trigger* function
-- that auto-enables RLS on newly created public tables. It cannot be
-- meaningfully called over RPC (it returns event_trigger and relies
-- on pg_event_trigger_ddl_commands()), but the anon/authenticated
-- EXECUTE grant is unnecessary and trips the advisor. Revoking it
-- does not affect the event trigger, which runs as its owner.

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated, PUBLIC;

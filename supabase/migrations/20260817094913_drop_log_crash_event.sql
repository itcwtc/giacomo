-- log_crash_event() inserted into public.crash_events, a table dropped by
-- drop_unused_legacy_tables. The function itself was never dropped alongside
-- it, leaving a broken function (calling it throws "relation crash_events
-- does not exist") that was still publicly callable via
-- /rest/v1/rpc/log_crash_event by both anon and authenticated roles.
-- The app already logs incidents by writing directly to incident_logs
-- (see userDashboard.js saveBlackBoxData()) — no replacement needed.
drop function if exists public.log_crash_event(uuid, double precision, double precision, text, numeric);

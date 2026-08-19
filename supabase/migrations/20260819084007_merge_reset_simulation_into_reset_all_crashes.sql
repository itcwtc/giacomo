-- "Reset Simulation Data" is being removed as a separate control — its
-- capability (clearing simulated incident history) folds into the
-- existing "RESET" button/RPC instead, so there's one admin-gated reset
-- action instead of two. Same convention as drop_log_crash_event.sql:
-- drop the now-unused function outright, no replacement stub.
drop function if exists public.reset_simulation_data();

-- Extends reset_all_crashes() (unchanged is_admin() guard) to also clear
-- simulated incident_logs rows, matching what reset_simulation_data() used
-- to do. Does not touch profiles.is_simulated or the
-- enforce_crash_simulated_consistency trigger -- both are unrelated to
-- this change and stay exactly as they are.
create or replace function reset_all_crashes()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not is_admin() then
    raise exception 'Only admins can reset crash alerts';
  end if;

  update profiles set is_crashed = false where is_crashed = true;
  delete from incident_logs where is_simulated = true;
end;
$$;

grant execute on function reset_all_crashes() to authenticated;

-- Single point of enforcement for "is_crashed=false implies is_simulated=
-- false" instead of relying on every UPDATE statement (2 client-side, 2
-- RPC) to remember to clear is_simulated manually. Whichever path clears
-- is_crashed -- Cancel Crash, the Reset button, or Reset Simulation Data --
-- automatically gets is_simulated cleared with it, so the two columns can
-- no longer drift out of sync no matter how a future code path resolves a
-- crash.
create or replace function enforce_crash_simulated_consistency()
returns trigger
language plpgsql
as $$
begin
  if new.is_crashed is false then
    new.is_simulated := false;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_crash_simulated_consistency on profiles;
create trigger trg_crash_simulated_consistency
before update on profiles
for each row
execute function enforce_crash_simulated_consistency();

-- Replaces the direct client-side UPDATE profiles SET is_crashed=false
-- WHERE is_crashed=true that resetAllCrashes() used to run. That direct
-- update was silently restricted by RLS's owner-only policy (auth.uid() =
-- id) to the admin's own row -- confirmed live: it returned 204 success
-- while leaving every real rider's is_crashed untouched. SECURITY DEFINER
-- bypasses RLS, with its own explicit is_admin() check inside the body
-- (not just relying on the execute grant) so a non-admin caller still
-- can't invoke it successfully.
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
end;
$$;

grant execute on function reset_all_crashes() to authenticated;

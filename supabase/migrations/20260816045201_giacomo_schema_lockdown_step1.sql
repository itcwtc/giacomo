-- ============================================================================
-- RECONSTRUCTED MIGRATION — NOT THE ORIGINAL AUTHORED SQL
--
-- This migration was applied directly to the live database (version
-- 20260816045201, confirmed via `list_migrations`) before this repo had a
-- supabase/migrations/ folder at all — no local file was ever committed for
-- it. This file was written afterward by introspecting the CURRENT live
-- schema (list_tables, pg_policies, pg_proc, information_schema.triggers)
-- and matching it against the handoff notes describing what "step 1" did.
--
-- Confidence: HIGH for what currently exists in the database (columns,
-- final RLS policies, function bodies below are copied verbatim from the
-- live introspection). LOWER for the exact original statement order/wording,
-- since Postgres does not retain migration diffs, only current state.
-- ============================================================================

-- profiles: add live-location + simulation-flag columns
alter table public.profiles add column if not exists lat double precision;
alter table public.profiles add column if not exists lon double precision;
alter table public.profiles add column if not exists is_simulated boolean not null default false;

-- incident_logs: crash telemetry table (create if this is genuinely step 1;
-- if it already existed, this is a no-op)
create table if not exists public.incident_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  rider_name text,
  velocity numeric,
  elevation numeric,
  latitude double precision,
  longitude double precision,
  "timestamp" timestamptz not null default now(),
  is_simulated boolean not null default false
);
alter table public.incident_logs enable row level security;

create policy if not exists "Users can view own incident logs"
  on public.incident_logs for select
  using (auth.uid() = user_id);

create policy if not exists "Users can insert own incident logs"
  on public.incident_logs for insert
  with check (auth.uid() = user_id);

-- profiles: baseline own-row RLS
alter table public.profiles enable row level security;

create policy if not exists "Users can manage own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- serial_number lock: once set, cannot be changed (protects printed QR codes
-- from ever pointing at the wrong rider record)
create or replace function public.prevent_serial_number_change()
returns trigger
language plpgsql
as $function$
begin
  if old.serial_number is not null and old.serial_number <> ''
     and new.serial_number is distinct from old.serial_number then
    raise exception 'serial_number is locked once set and cannot be changed';
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_lock_serial_number on public.profiles;
create trigger trg_lock_serial_number
  before update on public.profiles
  for each row execute function public.prevent_serial_number_change();

-- reset_simulation_data(): admin-only, clears simulated crash state
create or replace function public.reset_simulation_data()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  caller_role text;
begin
  select role into caller_role from profiles where id = auth.uid();
  if caller_role is distinct from 'admin' then
    raise exception 'Only admins can reset simulation data';
  end if;

  update profiles set is_crashed = false where is_simulated = true;
  delete from incident_logs where is_simulated = true;
end;
$function$;

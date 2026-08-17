-- devices table: pre-provisioned valid hardware serials, checked at claim time
create table if not exists devices (
  serial_number text primary key,
  is_claimed boolean not null default false,
  claimed_by uuid references auth.users(id),
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table devices enable row level security;
revoke all on devices from anon, authenticated;

-- atomic claim, prevents two people racing the same serial
create or replace function claim_device(p_serial text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimed boolean;
begin
  update devices
  set is_claimed = true,
      claimed_by = auth.uid(),
      claimed_at = now()
  where serial_number = p_serial
    and is_claimed = false
  returning true into v_claimed;

  return coalesce(v_claimed, false);
end;
$$;

grant execute on function claim_device(text) to authenticated;

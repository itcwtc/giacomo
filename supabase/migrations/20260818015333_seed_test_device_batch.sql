-- Test batch of 20 unclaimed device serials (GCMO-900001..GCMO-900020) for
-- end-to-end onboarding testing. Not real manufacturing serials — seeding
-- the actual production batch is a separate, still-pending task.
insert into devices (serial_number, is_claimed)
select 'GCMO-' || n::text, false
from generate_series(900001, 900020) as n
on conflict (serial_number) do nothing;

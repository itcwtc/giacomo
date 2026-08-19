-- Extends the original test batch (GCMO-900001..900020) with 5 more.
-- The original batch is nearly exhausted from live-testing use across
-- several investigations this session (each throwaway account permanently
-- locks its serial via profiles' serial-lock trigger, even after the
-- devices row is released back to unclaimed). Not real manufacturing
-- serials — same disclaimer as the original batch.
insert into devices (serial_number, is_claimed)
select 'GCMO-' || n::text, false
from generate_series(900021, 900025) as n
on conflict (serial_number) do nothing;

-- Backfills pre-existing accounts (sealed under the old, pre-devices-table
-- system) into the new gated onboarding flow. Verified against live data
-- first: profiles.serial_number is '' (not NULL) for the one row without a
-- real device, correctly excluded by the <> '' check; the demo1/GCMO-656789
-- row already has medical_completed_at/contacts_completed_at set (it went
-- through the new Steps 1-2 flow and only got stuck at the device-seal step),
-- so the is-null guards below correctly no-op on those two columns for it.

-- Register existing serials as already-claimed devices
insert into devices (serial_number, is_claimed, claimed_by, claimed_at)
select serial_number, true, id, coalesce(updated_at, now())
from profiles
where serial_number is not null and serial_number <> ''
on conflict (serial_number) do nothing;

-- Mark their device step as already sealed
update profiles
set device_sealed_at = coalesce(device_sealed_at, updated_at, now())
where serial_number is not null and serial_number <> ''
  and device_sealed_at is null;

-- Mark medical/contacts steps complete where the data already exists
update medical_profiles
set medical_completed_at = coalesce(medical_completed_at, updated_at, now())
where blood_type is not null and allergies is not null
  and medical_completed_at is null;

update medical_profiles
set contacts_completed_at = coalesce(contacts_completed_at, updated_at, now())
where contact_1_name is not null and contact_1_name <> ''
  and contacts_completed_at is null;

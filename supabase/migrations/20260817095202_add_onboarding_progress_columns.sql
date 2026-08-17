-- Progressive-save timestamps for the 3-step medical-onboarding flow.
-- Each doubles as an audit trail (when a step was completed), not just a
-- completion flag — set once, on successful save of that step.
alter table public.medical_profiles add column if not exists medical_completed_at timestamptz;
alter table public.medical_profiles add column if not exists contacts_completed_at timestamptz;

-- profiles.device_sealed_at is the single source of truth for "onboarding
-- fully complete" (no separate is_active boolean) — set only by the final,
-- irreversible claim_device() seal step.
alter table public.profiles add column if not exists device_sealed_at timestamptz;

-- Relationship-to-rider for each emergency contact (Parent/Spouse/Sibling/
-- Friend/Other) — the old schema only had name+phone per contact.
alter table public.medical_profiles add column if not exists contact_1_relationship text;
alter table public.medical_profiles add column if not exists contact_2_relationship text;
alter table public.medical_profiles add column if not exists contact_3_relationship text;

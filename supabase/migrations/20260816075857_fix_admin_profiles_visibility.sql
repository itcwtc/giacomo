-- ============================================================================
-- RECONSTRUCTED MIGRATION — NOT THE ORIGINAL AUTHORED SQL
--
-- Applied live as version 20260816075857, confirmed via `list_migrations`.
-- No local file was ever committed.
--
-- Confidence: LOW on the exact original SQL below. Postgres does not retain
-- superseded policy definitions — the next migration (fix_infinite_recursion_
-- admin_policy) replaced whatever this one created, so there is no live
-- artifact left to introspect. This is a plausible reconstruction of what a
-- migration named "fix_admin_profiles_visibility" would add (an admin-can-
-- view-all-profiles policy) written the way that reliably causes Postgres
-- error 42P17 (infinite recursion in policy for relation "profiles") — i.e.
-- a policy on `profiles` whose USING clause itself queries `profiles`. That
-- symptom is stated directly in the handoff notes and in the next migration's
-- name. Treat this file as "the shape of the bug," not a verified transcript.
-- ============================================================================

-- Believed original attempt — recurses because the USING clause queries the
-- very table the policy is attached to, re-triggering RLS evaluation on
-- itself (42P17).
create policy if not exists "Admins can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p2
      where p2.id = auth.uid() and p2.role = 'admin'
    )
  );

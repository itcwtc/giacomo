-- ============================================================================
-- RECONSTRUCTED MIGRATION — NOT THE ORIGINAL AUTHORED SQL
--
-- Applied live as version 20260816085646, confirmed via `list_migrations`.
-- No local file was ever committed.
--
-- Confidence: HIGH. Unlike the previous file, this one's end state is still
-- live today and was copied verbatim from pg_proc / pg_policies introspection
-- during this session's Task 0 audit — this is not a guess, it's the actual
-- current function body and policy definitions.
--
-- Fixes the 42P17 recursion from fix_admin_profiles_visibility by moving the
-- role check into a SECURITY DEFINER helper. Because is_admin() runs with
-- definer privileges, its internal SELECT against `profiles` bypasses RLS
-- entirely instead of re-triggering policy evaluation on the same table —
-- that's what breaks the recursion. This is now the standing pattern for any
-- policy that needs to check the caller's role or do a cross-user lookup.
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$function$;

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles for select
  using (is_admin());

drop policy if exists "Admins can view all incident logs" on public.incident_logs;
create policy "Admins can view all incident logs"
  on public.incident_logs for select
  using (is_admin());

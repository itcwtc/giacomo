-- ============================================================================
-- RECONSTRUCTED MIGRATION — NOT THE ORIGINAL AUTHORED SQL
--
-- Applied live as version 20260816074820, confirmed via `list_migrations`.
-- No local file was ever committed. Reconstructed from the handoff notes
-- ("Dropped unused medical_info and crash_events tables") plus confirmation
-- that neither table exists in the live schema today.
--
-- Confidence: HIGH that these two DROPs happened here — this is the only
-- migration name that matches. NOTE (found during this session's Task 0
-- audit, not fixed here): the function public.log_crash_event(), which
-- inserts into crash_events, was NOT dropped alongside the table — it is
-- currently a broken, orphaned, publicly-callable RPC. Addressed in a
-- separate migration (drop_log_crash_event), not folded into this backfill,
-- since this file is meant to reflect what the original migration actually
-- did, not retroactively fix its gap.
-- ============================================================================

drop table if exists public.medical_info cascade;
drop table if exists public.crash_events cascade;

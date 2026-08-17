-- Accessibility preferences, synced server-side so they follow the rider
-- across devices rather than living only in one browser's localStorage.
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id),
  text_scale text not null default 'normal' check (text_scale in ('normal','large','xlarge')),
  high_contrast boolean not null default false,
  reduce_motion boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

create policy "Users can manage own preferences"
  on public.user_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Phase 4: user-owned journal entries for tracked media.
-- Journal entries store the current personal status, rating, and short review
-- for a media item. Detailed history remains deferred to a future journal_events table.

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_item_id uuid not null references public.media_items(id),
  status text not null,
  rating numeric(2,1),
  review_headline text,
  review_body text,
  contains_spoilers boolean not null default false,
  started_on date,
  completed_on date,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint journal_entries_user_media_item_key
    unique (user_id, media_item_id),

  constraint journal_entries_status_check
    check (status in ('planned', 'in_progress', 'completed', 'dropped')),

  constraint journal_entries_rating_check
    check (
      rating is null
      or (
        rating between 0.5 and 5.0
        and rating * 2 = trunc(rating * 2)
      )
    ),

  constraint journal_entries_review_headline_length_check
    check (review_headline is null or char_length(review_headline) <= 80),

  constraint journal_entries_review_body_length_check
    check (review_body is null or char_length(review_body) <= 500),

  constraint journal_entries_completed_on_status_check
    check (status = 'completed' or completed_on is null)
);

create index if not exists journal_entries_user_updated_at_idx
on public.journal_entries (user_id, updated_at desc);

create index if not exists journal_entries_user_status_idx
on public.journal_entries (user_id, status);

create index if not exists journal_entries_user_media_item_idx
on public.journal_entries (user_id, media_item_id);

create or replace function public.set_journal_entries_activity_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status <> 'completed' then
    new.completed_on = null;
  end if;

  if tg_op = 'INSERT' then
    new.last_activity_at = coalesce(new.last_activity_at, now());
  elsif (
    new.status is distinct from old.status
    or new.rating is distinct from old.rating
    or new.review_headline is distinct from old.review_headline
    or new.review_body is distinct from old.review_body
    or new.contains_spoilers is distinct from old.contains_spoilers
    or new.started_on is distinct from old.started_on
    or new.completed_on is distinct from old.completed_on
  ) then
    new.last_activity_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists set_journal_entries_activity_fields on public.journal_entries;

create trigger set_journal_entries_activity_fields
before insert or update on public.journal_entries
for each row
execute function public.set_journal_entries_activity_fields();

drop trigger if exists set_journal_entries_updated_at on public.journal_entries;

create trigger set_journal_entries_updated_at
before update on public.journal_entries
for each row
execute function public.set_updated_at();

alter table public.journal_entries enable row level security;

drop policy if exists "Users can insert their own journal entries" on public.journal_entries;
create policy "Users can insert their own journal entries"
on public.journal_entries
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can read their own journal entries" on public.journal_entries;
create policy "Users can read their own journal entries"
on public.journal_entries
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can update their own journal entries" on public.journal_entries;
create policy "Users can update their own journal entries"
on public.journal_entries
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete their own journal entries" on public.journal_entries;
create policy "Users can delete their own journal entries"
on public.journal_entries
for delete
to authenticated
using (user_id = auth.uid());

-- Revit v1.1 Journal foundation.
--
-- Keep one journal_entries row per user/title for current state and an active
-- plan. Store user-dated activity in journal_events so first watches, rewatches,
-- starts, and stops never overwrite one another.

alter table public.journal_entries
add column if not exists has_active_plan boolean not null default false,
add column if not exists planned_for date;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'journal_entries_active_plan_date_check'
      and conrelid = 'public.journal_entries'::regclass
  ) then
    alter table public.journal_entries
    add constraint journal_entries_active_plan_date_check
    check (has_active_plan or planned_for is null);
  end if;
end
$$;

-- A composite key lets journal_events enforce that its user_id owns the parent
-- journal entry without relying only on application code or an RLS join.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'journal_entries_id_user_id_key'
      and conrelid = 'public.journal_entries'::regclass
  ) then
    alter table public.journal_entries
    add constraint journal_entries_id_user_id_key unique (id, user_id);
  end if;
end
$$;

-- In the v1 form, started_on is labelled "Planned for" when status is planned.
-- Null remains meaningful: it represents an active Someday plan.
update public.journal_entries
set
  has_active_plan = true,
  planned_for = started_on
where status = 'planned';

create table public.journal_events (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null,
  user_id uuid not null,
  event_type text not null,
  event_date date not null,
  rating numeric(2,1),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint journal_events_entry_owner_fkey
    foreign key (journal_entry_id, user_id)
    references public.journal_entries(id, user_id)
    on delete cascade,

  constraint journal_events_type_check
    check (event_type in ('started', 'completed', 'stopped')),

  constraint journal_events_rating_check
    check (
      rating is null
      or (
        rating between 0.5 and 5.0
        and rating * 2 = trunc(rating * 2)
      )
    ),

  constraint journal_events_completed_rating_check
    check (event_type = 'completed' or rating is null),

  constraint journal_events_notes_length_check
    check (notes is null or char_length(notes) <= 500)
);

create index journal_events_user_date_created_idx
on public.journal_events (user_id, event_date desc, created_at desc);

create index journal_events_entry_date_created_idx
on public.journal_events (journal_entry_id, event_date desc, created_at desc);

create index journal_entries_active_plan_date_idx
on public.journal_entries (user_id, planned_for)
where has_active_plan;

create trigger set_journal_events_updated_at
before update on public.journal_events
for each row
execute function public.set_updated_at();

alter table public.journal_events enable row level security;

-- New Supabase projects no longer expose public tables to Data API roles by
-- default. Grant only the operations the authenticated mobile client requires.
revoke all on table public.journal_events from anon;
grant select, insert, update, delete on table public.journal_events to authenticated;

create policy "Users can read their own journal events"
on public.journal_events
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own journal events"
on public.journal_events
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own journal events"
on public.journal_events
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own journal events"
on public.journal_events
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Backfill only dates the user explicitly selected in the v1 form. Preserve
-- source timestamps as metadata and as an idempotency guard; never use them as
-- event_date.
insert into public.journal_events (
  journal_entry_id,
  user_id,
  event_type,
  event_date,
  rating,
  notes,
  created_at,
  updated_at
)
select
  entry.id,
  entry.user_id,
  'completed',
  entry.completed_on,
  entry.rating,
  entry.review_body,
  entry.created_at,
  entry.updated_at
from public.journal_entries as entry
where entry.status = 'completed'
  and entry.completed_on is not null
  and not exists (
    select 1
    from public.journal_events as event
    where event.journal_entry_id = entry.id
      and event.event_type = 'completed'
      and event.event_date = entry.completed_on
      and event.created_at = entry.created_at
  );

insert into public.journal_events (
  journal_entry_id,
  user_id,
  event_type,
  event_date,
  created_at,
  updated_at
)
select
  entry.id,
  entry.user_id,
  'started',
  entry.started_on,
  entry.created_at,
  entry.updated_at
from public.journal_entries as entry
where entry.status = 'in_progress'
  and entry.started_on is not null
  and not exists (
    select 1
    from public.journal_events as event
    where event.journal_entry_id = entry.id
      and event.event_type = 'started'
      and event.event_date = entry.started_on
      and event.created_at = entry.created_at
  );

-- The current v1 UI confirms started_on is labelled "Dropped on" for dropped
-- entries, so it is safe to migrate that user-selected date as a stopped event.
insert into public.journal_events (
  journal_entry_id,
  user_id,
  event_type,
  event_date,
  notes,
  created_at,
  updated_at
)
select
  entry.id,
  entry.user_id,
  'stopped',
  entry.started_on,
  entry.review_body,
  entry.created_at,
  entry.updated_at
from public.journal_entries as entry
where entry.status = 'dropped'
  and entry.started_on is not null
  and not exists (
    select 1
    from public.journal_events as event
    where event.journal_entry_id = entry.id
      and event.event_type = 'stopped'
      and event.event_date = entry.started_on
      and event.created_at = entry.created_at
  );

-- Keep all v1 source columns during the staged rollout. completed rows without
-- completed_on and any other ambiguous legacy rows retain their title state but
-- do not receive an invented event date.

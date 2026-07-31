-- v1.1 Journal review remediation.
--
-- Keep installed v1 clients and the v1.1 lifecycle RPCs coherent during the
-- staged rollout, preserve undated legacy completions without inventing a
-- date, and provide a bounded completion-origin lookup for Timeline pages.

alter table public.journal_entries
add column if not exists undated_completed_count integer not null default 0,
add column if not exists legacy_bridge_statement_at timestamptz;

alter table public.journal_entries
drop constraint if exists journal_entries_undated_completed_count_check;

alter table public.journal_entries
add constraint journal_entries_undated_completed_count_check
check (undated_completed_count between 0 and 1);

update public.journal_entries as entry
set undated_completed_count = 1
where entry.status = 'completed'
  and entry.completed_on is null
  and not exists (
    select 1
    from public.journal_events as event
    where event.journal_entry_id = entry.id
      and event.user_id = entry.user_id
      and event.event_type = 'completed'
  );

alter table public.journal_events
add column if not exists is_legacy_mirror boolean not null default false,
add column if not exists legacy_bridge_statement_at timestamptz;

create unique index if not exists journal_events_one_legacy_mirror_per_entry_idx
on public.journal_events (journal_entry_id)
where is_legacy_mirror;

create index if not exists journal_events_first_completion_idx
on public.journal_events (journal_entry_id, event_date, created_at, id)
where event_type = 'completed';

-- Existing migration backfills are the dated representation of the v1 row.
update public.journal_events as event
set
  is_legacy_mirror = true,
  legacy_bridge_statement_at = null
from public.journal_entries as entry
where event.journal_entry_id = entry.id
  and event.user_id = entry.user_id
  and event.operation_id is null
  and (
    (event.event_type = 'completed'
      and entry.status = 'completed'
      and event.event_date = entry.completed_on
      and event.rating is not distinct from entry.rating
      and event.notes is not distinct from entry.review_body)
    or (event.event_type = 'started'
      and entry.status = 'in_progress'
      and event.event_date = entry.started_on)
    or (event.event_type = 'stopped'
      and entry.status = 'dropped'
      and event.event_date = entry.started_on)
  )
  and not exists (
    select 1
    from public.journal_events as existing
    where existing.journal_entry_id = event.journal_entry_id
      and existing.is_legacy_mirror
      and existing.id <> event.id
  );

create or replace function public.journal_bridge_legacy_entry_before()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_legacy_changed boolean;
  v_legacy_plan_write boolean := false;
  v_latest_event public.journal_events%rowtype;
  v_plan_changed boolean;
  v_requested_status text := new.status;
begin
  -- Entry writes caused by the event bridge are already normalized.
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  v_legacy_changed := tg_op = 'INSERT' or (
    new.status is distinct from old.status
    or new.rating is distinct from old.rating
    or new.review_headline is distinct from old.review_headline
    or new.review_body is distinct from old.review_body
    or new.contains_spoilers is distinct from old.contains_spoilers
    or new.started_on is distinct from old.started_on
    or new.completed_on is distinct from old.completed_on
  );
  v_plan_changed := tg_op = 'UPDATE' and (
    new.has_active_plan is distinct from old.has_active_plan
    or new.planned_for is distinct from old.planned_for
  );

  if not v_legacy_changed then
    return new;
  end if;

  new.legacy_bridge_statement_at := statement_timestamp();

  -- A v1 planned row used started_on as its optional plan date.
  if v_requested_status = 'planned'
    and not v_plan_changed
    and (tg_op = 'UPDATE' or (not new.has_active_plan and new.planned_for is null)) then
    new.has_active_plan := true;
    new.planned_for := new.started_on;
    v_legacy_plan_write := true;

    -- v1 used one row for either activity or a plan. In v1.1, keep the plan
    -- independent and restore the canonical current activity from history.
    select *
    into v_latest_event
    from public.journal_events
    where journal_entry_id = new.id
      and user_id = new.user_id
    order by event_date desc, created_at desc, id desc
    limit 1;

    if found then
      new.status := case v_latest_event.event_type
        when 'started' then 'in_progress'
        when 'completed' then 'completed'
        when 'stopped' then 'dropped'
      end;
      new.started_on := case
        when v_latest_event.event_type in ('started', 'stopped')
          then v_latest_event.event_date
        else null
      end;
      new.completed_on := case
        when v_latest_event.event_type = 'completed'
          then v_latest_event.event_date
        else null
      end;
      new.rating := case
        when v_latest_event.event_type = 'completed' then v_latest_event.rating
        when v_latest_event.is_legacy_mirror then new.rating
        else null
      end;
      new.review_headline := case
        when v_latest_event.is_legacy_mirror then new.review_headline
        else null
      end;
      new.review_body := v_latest_event.notes;
      new.contains_spoilers := case
        when v_latest_event.is_legacy_mirror then new.contains_spoilers
        else false
      end;
    elsif new.undated_completed_count > 0 then
      new.status := 'completed';
      new.started_on := null;
      new.completed_on := null;
    end if;
  elsif tg_op = 'UPDATE' and old.status = 'planned' and not v_plan_changed then
    new.has_active_plan := false;
    new.planned_for := null;
  end if;

  if not v_legacy_plan_write then
    if new.status = 'completed' and new.completed_on is null then
      new.undated_completed_count := 1;
    elsif new.status <> 'planned' then
      new.undated_completed_count := 0;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.journal_bridge_legacy_entry_after()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_legacy_changed boolean;
  v_plan_changed boolean;
  v_event_type text;
  v_event_date date;
begin
  if pg_trigger_depth() > 1 then
    return null;
  end if;

  v_legacy_changed := tg_op = 'INSERT' or (
    new.status is distinct from old.status
    or new.rating is distinct from old.rating
    or new.review_headline is distinct from old.review_headline
    or new.review_body is distinct from old.review_body
    or new.contains_spoilers is distinct from old.contains_spoilers
    or new.started_on is distinct from old.started_on
    or new.completed_on is distinct from old.completed_on
  );

  if not v_legacy_changed then
    return null;
  end if;

  v_plan_changed := tg_op = 'UPDATE' and (
    new.has_active_plan is distinct from old.has_active_plan
    or new.planned_for is distinct from old.planned_for
  );

  -- The BEFORE bridge already restored canonical activity for this legacy
  -- plan statement. Do not reinterpret those restored fields as a new event.
  if new.has_active_plan
    and v_plan_changed
    and new.legacy_bridge_statement_at = statement_timestamp() then
    return null;
  end if;

  v_event_type := case new.status
    when 'completed' then 'completed'
    when 'in_progress' then 'started'
    when 'dropped' then 'stopped'
    else null
  end;
  v_event_date := case
    when new.status = 'completed' then new.completed_on
    when new.status in ('in_progress', 'dropped') then new.started_on
    else null
  end;

  -- A v1 client plans by changing its single row. In v1.1 that is an
  -- independent plan, so preserve any already-mirrored dated history.
  if new.status = 'planned' then
    return null;
  end if;

  if v_event_type is null or v_event_date is null then
    delete from public.journal_events
    where journal_entry_id = new.id
      and user_id = new.user_id
      and is_legacy_mirror;
    return null;
  end if;

  insert into public.journal_events (
    journal_entry_id,
    user_id,
    event_type,
    event_date,
    rating,
    notes,
    is_legacy_mirror,
    legacy_bridge_statement_at
  )
  values (
    new.id,
    new.user_id,
    v_event_type,
    v_event_date,
    case when v_event_type = 'completed' then new.rating else null end,
    case
      when v_event_type in ('started', 'completed', 'stopped') then new.review_body
      else null
    end,
    true,
    statement_timestamp()
  )
  on conflict (journal_entry_id) where is_legacy_mirror
  do update set
    event_type = excluded.event_type,
    event_date = excluded.event_date,
    rating = excluded.rating,
    notes = excluded.notes,
    legacy_bridge_statement_at = excluded.legacy_bridge_statement_at;

  return null;
end;
$$;

create or replace function public.journal_bridge_event_before()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and not new.is_legacy_mirror then
    -- journal_log_event first creates its title row. Remove only the mirror
    -- made by that same transaction, never an older v1 watch.
    delete from public.journal_events
    where journal_entry_id = new.journal_entry_id
      and user_id = new.user_id
      and is_legacy_mirror
      and legacy_bridge_statement_at = statement_timestamp();

    -- A fresh v1.1 completed title briefly resembles an undated legacy row
    -- before its dated event is inserted in the same transaction.
    if new.event_type = 'completed' then
      update public.journal_entries
      set undated_completed_count = 0
      where id = new.journal_entry_id
        and user_id = new.user_id
        and undated_completed_count = 1
        and legacy_bridge_statement_at = statement_timestamp();
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.journal_bridge_event_after()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_entry_id uuid := coalesce(new.journal_entry_id, old.journal_entry_id);
  v_user_id uuid := coalesce(new.user_id, old.user_id);
  v_latest public.journal_events%rowtype;
begin
  select *
  into v_latest
  from public.journal_events
  where journal_entry_id = v_entry_id
    and user_id = v_user_id
  order by event_date desc, created_at desc, id desc
  limit 1;

  if not found then
    update public.journal_entries
    set
      status = case
        when undated_completed_count > 0 then 'completed'
        else status
      end,
      started_on = null,
      completed_on = null,
      rating = null,
      review_headline = null,
      review_body = null,
      contains_spoilers = false
    where id = v_entry_id
      and user_id = v_user_id;
    return null;
  end if;

  update public.journal_entries
  set
    status = case v_latest.event_type
      when 'started' then 'in_progress'
      when 'completed' then 'completed'
      when 'stopped' then 'dropped'
    end,
    started_on = case
      when v_latest.event_type in ('started', 'stopped') then v_latest.event_date
      else null
    end,
    completed_on = case
      when v_latest.event_type = 'completed' then v_latest.event_date
      else null
    end,
    rating = case
      when v_latest.event_type = 'completed' then v_latest.rating
      when v_latest.is_legacy_mirror then rating
      else null
    end,
    review_headline = case when v_latest.is_legacy_mirror then review_headline else null end,
    review_body = v_latest.notes,
    contains_spoilers = case
      when v_latest.is_legacy_mirror then contains_spoilers
      else false
    end
  where id = v_entry_id
    and user_id = v_user_id;

  return null;
end;
$$;

drop trigger if exists journal_bridge_legacy_entry_before on public.journal_entries;
create trigger journal_bridge_legacy_entry_before
before insert or update on public.journal_entries
for each row execute function public.journal_bridge_legacy_entry_before();

drop trigger if exists journal_bridge_legacy_entry_after on public.journal_entries;
create trigger journal_bridge_legacy_entry_after
after insert or update on public.journal_entries
for each row execute function public.journal_bridge_legacy_entry_after();

drop trigger if exists journal_bridge_event_before on public.journal_events;
create trigger journal_bridge_event_before
before insert on public.journal_events
for each row execute function public.journal_bridge_event_before();

drop trigger if exists journal_bridge_event_after on public.journal_events;
create trigger journal_bridge_event_after
after insert or update or delete on public.journal_events
for each row execute function public.journal_bridge_event_after();

revoke execute on function public.journal_bridge_legacy_entry_before() from public, anon, authenticated;
revoke execute on function public.journal_bridge_legacy_entry_after() from public, anon, authenticated;
revoke execute on function public.journal_bridge_event_before() from public, anon, authenticated;
revoke execute on function public.journal_bridge_event_after() from public, anon, authenticated;

create or replace function public.journal_get_completion_origins(
  p_journal_entry_ids uuid[]
)
returns table (
  journal_entry_id uuid,
  first_completed_event_id uuid,
  has_undated_completion boolean
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if coalesce(cardinality(p_journal_entry_ids), 0) > 50 then
    raise exception 'At most 50 Journal entries can be inspected at once.' using errcode = '22023';
  end if;

  return query
  select
    entry.id,
    first_completion.id,
    entry.undated_completed_count > 0
  from public.journal_entries as entry
  left join lateral (
    select event.id
    from public.journal_events as event
    where event.journal_entry_id = entry.id
      and event.user_id = v_user_id
      and event.event_type = 'completed'
    order by event.event_date, event.created_at, event.id
    limit 1
  ) as first_completion on true
  where entry.user_id = v_user_id
    and entry.id = any(coalesce(p_journal_entry_ids, array[]::uuid[]));
end;
$$;

revoke execute on function public.journal_get_completion_origins(uuid[]) from public, anon;
grant execute on function public.journal_get_completion_origins(uuid[]) to authenticated;

-- Preserve an undated legacy completion when the last dated event is removed.
create or replace function public.journal_delete_event(
  p_event_id uuid,
  p_empty_title_action text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_entry public.journal_entries%rowtype;
  v_event public.journal_events%rowtype;
  v_remaining_event_count integer;
  v_latest_event_type text;
  v_title_deleted boolean := false;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_empty_title_action is not null
    and p_empty_title_action not in ('keep_someday', 'remove') then
    raise exception 'Unsupported empty-title action.' using errcode = '22023';
  end if;

  select journal_entry_id
  into v_event.journal_entry_id
  from public.journal_events
  where id = p_event_id
    and user_id = v_user_id;

  if not found then
    raise exception 'Journal event not found.' using errcode = 'P0002';
  end if;

  select *
  into v_entry
  from public.journal_entries
  where id = v_event.journal_entry_id
    and user_id = v_user_id
  for update;

  select *
  into v_event
  from public.journal_events
  where id = p_event_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Journal event not found.' using errcode = 'P0002';
  end if;

  delete from public.journal_events
  where id = v_event.id
    and user_id = v_user_id;

  select count(*)::integer
  into v_remaining_event_count
  from public.journal_events
  where journal_entry_id = v_entry.id
    and user_id = v_user_id;

  if v_remaining_event_count > 0 then
    select event_type
    into v_latest_event_type
    from public.journal_events
    where journal_entry_id = v_entry.id
      and user_id = v_user_id
    order by event_date desc, created_at desc, id desc
    limit 1;

    update public.journal_entries
    set status = case v_latest_event_type
      when 'started' then 'in_progress'
      when 'completed' then 'completed'
      when 'stopped' then 'dropped'
    end
    where id = v_entry.id
      and user_id = v_user_id;
  elsif v_entry.undated_completed_count > 0 then
    update public.journal_entries
    set status = 'completed'
    where id = v_entry.id
      and user_id = v_user_id;
  elsif v_entry.has_active_plan then
    update public.journal_entries
    set status = 'planned'
    where id = v_entry.id
      and user_id = v_user_id;
  elsif p_empty_title_action = 'keep_someday' then
    update public.journal_entries
    set
      status = 'planned',
      has_active_plan = true,
      planned_for = null
    where id = v_entry.id
      and user_id = v_user_id;
  elsif p_empty_title_action = 'remove' then
    delete from public.journal_entries
    where id = v_entry.id
      and user_id = v_user_id;
    v_title_deleted := true;
  else
    raise exception 'Choose whether to keep this title in Someday or remove it.' using errcode = '22023';
  end if;

  return jsonb_build_object(
    'user_id', v_user_id,
    'media_item_id', v_entry.media_item_id,
    'journal_entry_id', v_entry.id,
    'event_id', v_event.id,
    'title_deleted', v_title_deleted,
    'idempotent_replay', false,
    'affected_dates', array[v_event.event_date]
  );
end;
$$;

revoke execute on function public.journal_delete_event(uuid, text) from public, anon;
grant execute on function public.journal_delete_event(uuid, text) to authenticated;

-- Removing a plan must not delete a title whose only watch is the preserved
-- undated legacy completion.
create or replace function public.journal_remove_plan(
  p_journal_entry_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_entry public.journal_entries%rowtype;
  v_event_count integer;
  v_latest_event_type text;
  v_title_deleted boolean := false;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select *
  into v_entry
  from public.journal_entries
  where id = p_journal_entry_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Journal title not found.' using errcode = 'P0002';
  end if;

  if not v_entry.has_active_plan then
    return jsonb_build_object(
      'user_id', v_user_id,
      'media_item_id', v_entry.media_item_id,
      'journal_entry_id', v_entry.id,
      'event_id', null,
      'title_deleted', false,
      'idempotent_replay', true,
      'affected_dates', array[]::date[]
    );
  end if;

  select count(*)::integer
  into v_event_count
  from public.journal_events
  where journal_entry_id = v_entry.id
    and user_id = v_user_id;

  if v_event_count = 0
    and v_entry.undated_completed_count = 0
    and v_entry.status = 'planned' then
    delete from public.journal_entries
    where id = v_entry.id
      and user_id = v_user_id;
    v_title_deleted := true;
  else
    if v_event_count > 0 then
      select event_type
      into v_latest_event_type
      from public.journal_events
      where journal_entry_id = v_entry.id
        and user_id = v_user_id
      order by event_date desc, created_at desc, id desc
      limit 1;
    end if;

    update public.journal_entries
    set
      has_active_plan = false,
      planned_for = null,
      status = case v_latest_event_type
        when 'started' then 'in_progress'
        when 'completed' then 'completed'
        when 'stopped' then 'dropped'
        else case
          when undated_completed_count > 0 then 'completed'
          else status
        end
      end
    where id = v_entry.id
      and user_id = v_user_id;
  end if;

  return jsonb_build_object(
    'user_id', v_user_id,
    'media_item_id', v_entry.media_item_id,
    'journal_entry_id', v_entry.id,
    'event_id', null,
    'title_deleted', v_title_deleted,
    'idempotent_replay', false,
    'affected_dates', array_remove(array[v_entry.planned_for], null)
  );
end;
$$;

revoke execute on function public.journal_remove_plan(uuid) from public, anon;
grant execute on function public.journal_remove_plan(uuid) to authenticated;

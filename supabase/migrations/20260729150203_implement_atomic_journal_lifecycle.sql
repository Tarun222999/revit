-- Revit v1.1 Journal lifecycle operations.
--
-- Keep every title-state/event transition inside one database transaction.
-- Functions run as the authenticated caller so the existing owner-only RLS
-- policies remain the final authorization boundary.

alter table public.journal_events
add column if not exists operation_id uuid,
add column if not exists resolved_active_plan boolean not null default false;

create unique index if not exists journal_events_user_operation_id_key
on public.journal_events (user_id, operation_id)
where operation_id is not null;

create or replace function public.journal_save_plan(
  p_media_item_id uuid,
  p_planned_for date,
  p_today date
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_entry public.journal_entries%rowtype;
  v_previous_planned_for date;
  v_latest_event_type text;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_media_item_id is null or p_today is null then
    raise exception 'Media item and local today date are required.' using errcode = '22023';
  end if;

  if p_planned_for is not null and p_planned_for < p_today then
    raise exception 'A new planned date cannot be in the past.' using errcode = '22023';
  end if;

  insert into public.journal_entries (
    user_id,
    media_item_id,
    status,
    has_active_plan,
    planned_for
  )
  values (v_user_id, p_media_item_id, 'planned', true, p_planned_for)
  on conflict (user_id, media_item_id) do nothing;

  select *
  into v_entry
  from public.journal_entries
  where user_id = v_user_id
    and media_item_id = p_media_item_id
  for update;

  if not found then
    raise exception 'Journal title not found.' using errcode = 'P0002';
  end if;

  v_previous_planned_for := v_entry.planned_for;

  select event_type
  into v_latest_event_type
  from public.journal_events
  where journal_entry_id = v_entry.id
    and user_id = v_user_id
  order by event_date desc, created_at desc, id desc
  limit 1;

  update public.journal_entries
  set
    has_active_plan = true,
    planned_for = p_planned_for,
    status = case v_latest_event_type
      when 'started' then 'in_progress'
      when 'completed' then 'completed'
      when 'stopped' then 'dropped'
      else status
    end
  where id = v_entry.id
    and user_id = v_user_id
  returning * into v_entry;

  return jsonb_build_object(
    'user_id', v_user_id,
    'media_item_id', v_entry.media_item_id,
    'journal_entry_id', v_entry.id,
    'event_id', null,
    'title_deleted', false,
    'idempotent_replay', false,
    'affected_dates', array_remove(array[v_previous_planned_for, p_planned_for], null)
  );
end;
$$;

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

  if v_event_count = 0 and v_entry.status = 'planned' then
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
        else status
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

create or replace function public.journal_log_event(
  p_media_item_id uuid,
  p_event_type text,
  p_event_date date,
  p_rating numeric,
  p_notes text,
  p_resolve_active_plan boolean,
  p_request_id uuid,
  p_today date
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
  v_latest_event_type text;
  v_previous_planned_for date;
  v_normalized_notes text := nullif(btrim(p_notes), '');
  v_expected_status text;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_media_item_id is null or p_event_date is null or p_today is null or p_request_id is null then
    raise exception 'Media item, event date, request ID, and local today date are required.' using errcode = '22023';
  end if;

  if p_event_type not in ('started', 'completed', 'stopped') then
    raise exception 'Unsupported Journal event type.' using errcode = '22023';
  end if;

  if p_event_date > p_today then
    raise exception 'Journal activity cannot be dated in the future.' using errcode = '22023';
  end if;

  if p_event_type <> 'completed' and p_rating is not null then
    raise exception 'Only completed events can have a rating.' using errcode = '22023';
  end if;

  v_expected_status := case p_event_type
    when 'started' then 'in_progress'
    when 'completed' then 'completed'
    when 'stopped' then 'dropped'
  end;

  insert into public.journal_entries (
    user_id,
    media_item_id,
    status,
    has_active_plan,
    planned_for
  )
  values (v_user_id, p_media_item_id, v_expected_status, false, null)
  on conflict (user_id, media_item_id) do nothing;

  select *
  into v_entry
  from public.journal_entries
  where user_id = v_user_id
    and media_item_id = p_media_item_id
  for update;

  if not found then
    raise exception 'Journal title not found.' using errcode = 'P0002';
  end if;

  v_previous_planned_for := v_entry.planned_for;

  insert into public.journal_events (
    journal_entry_id,
    user_id,
    event_type,
    event_date,
    rating,
    notes,
    operation_id,
    resolved_active_plan,
    created_at,
    updated_at
  )
  values (
    v_entry.id,
    v_user_id,
    p_event_type,
    p_event_date,
    p_rating,
    v_normalized_notes,
    p_request_id,
    p_resolve_active_plan,
    clock_timestamp(),
    clock_timestamp()
  )
  on conflict (user_id, operation_id) where operation_id is not null do nothing
  returning * into v_event;

  if not found then
    select *
    into v_event
    from public.journal_events
    where user_id = v_user_id
      and operation_id = p_request_id;

    if not found then
      raise exception 'Journal request could not be resolved.' using errcode = 'P0001';
    end if;

    if v_event.journal_entry_id <> v_entry.id
      or v_event.event_type <> p_event_type
      or v_event.event_date <> p_event_date
      or v_event.rating is distinct from p_rating
      or v_event.notes is distinct from v_normalized_notes
      or v_event.resolved_active_plan <> p_resolve_active_plan then
      raise exception 'Journal request ID was already used for a different operation.' using errcode = '22023';
    end if;

    return jsonb_build_object(
      'user_id', v_user_id,
      'media_item_id', v_entry.media_item_id,
      'journal_entry_id', v_entry.id,
      'event_id', v_event.id,
      'title_deleted', false,
      'idempotent_replay', true,
      'affected_dates', array[p_event_date]
    );
  end if;

  select event_type
  into v_latest_event_type
  from public.journal_events
  where journal_entry_id = v_entry.id
    and user_id = v_user_id
  order by event_date desc, created_at desc, id desc
  limit 1;

  update public.journal_entries
  set
    has_active_plan = case when p_resolve_active_plan then false else has_active_plan end,
    planned_for = case when p_resolve_active_plan then null else planned_for end,
    status = case v_latest_event_type
      when 'started' then 'in_progress'
      when 'completed' then 'completed'
      when 'stopped' then 'dropped'
    end
  where id = v_entry.id
    and user_id = v_user_id;

  return jsonb_build_object(
    'user_id', v_user_id,
    'media_item_id', v_entry.media_item_id,
    'journal_entry_id', v_entry.id,
    'event_id', v_event.id,
    'title_deleted', false,
    'idempotent_replay', false,
    'affected_dates', array_remove(
      array[p_event_date, case when p_resolve_active_plan then v_previous_planned_for else null end],
      null
    )
  );
end;
$$;

create or replace function public.journal_update_event(
  p_event_id uuid,
  p_event_date date,
  p_rating numeric,
  p_notes text,
  p_today date
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
  v_previous_event_date date;
  v_latest_event_type text;
  v_normalized_notes text := nullif(btrim(p_notes), '');
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_event_id is null or p_event_date is null or p_today is null then
    raise exception 'Event and local dates are required.' using errcode = '22023';
  end if;

  if p_event_date > p_today then
    raise exception 'Journal activity cannot be dated in the future.' using errcode = '22023';
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

  if v_event.event_type <> 'completed' and p_rating is not null then
    raise exception 'Only completed events can have a rating.' using errcode = '22023';
  end if;

  v_previous_event_date := v_event.event_date;

  update public.journal_events
  set
    event_date = p_event_date,
    rating = p_rating,
    notes = v_normalized_notes
  where id = v_event.id
    and user_id = v_user_id;

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

  return jsonb_build_object(
    'user_id', v_user_id,
    'media_item_id', v_entry.media_item_id,
    'journal_entry_id', v_entry.id,
    'event_id', v_event.id,
    'title_deleted', false,
    'idempotent_replay', false,
    'affected_dates', array[v_previous_event_date, p_event_date]
  );
end;
$$;

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

create or replace function public.journal_remove_title(
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
  v_completed_count integer;
  v_event_dates date[];
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

  select
    count(*)::integer,
    count(*) filter (where event_type = 'completed')::integer,
    coalesce(array_agg(distinct event_date), array[]::date[])
  into v_event_count, v_completed_count, v_event_dates
  from public.journal_events
  where journal_entry_id = v_entry.id
    and user_id = v_user_id;

  delete from public.journal_entries
  where id = v_entry.id
    and user_id = v_user_id;

  return jsonb_build_object(
    'user_id', v_user_id,
    'media_item_id', v_entry.media_item_id,
    'journal_entry_id', v_entry.id,
    'event_id', null,
    'title_deleted', true,
    'idempotent_replay', false,
    'event_count', v_event_count,
    'completed_count', v_completed_count,
    'had_active_plan', v_entry.has_active_plan,
    'affected_dates', array_remove(v_event_dates || v_entry.planned_for, null)
  );
end;
$$;

revoke execute on function public.journal_save_plan(uuid, date, date) from public, anon;
revoke execute on function public.journal_remove_plan(uuid) from public, anon;
revoke execute on function public.journal_log_event(uuid, text, date, numeric, text, boolean, uuid, date) from public, anon;
revoke execute on function public.journal_update_event(uuid, date, numeric, text, date) from public, anon;
revoke execute on function public.journal_delete_event(uuid, text) from public, anon;
revoke execute on function public.journal_remove_title(uuid) from public, anon;

grant execute on function public.journal_save_plan(uuid, date, date) to authenticated;
grant execute on function public.journal_remove_plan(uuid) to authenticated;
grant execute on function public.journal_log_event(uuid, text, date, numeric, text, boolean, uuid, date) to authenticated;
grant execute on function public.journal_update_event(uuid, date, numeric, text, date) to authenticated;
grant execute on function public.journal_delete_event(uuid, text) to authenticated;
grant execute on function public.journal_remove_title(uuid) to authenticated;

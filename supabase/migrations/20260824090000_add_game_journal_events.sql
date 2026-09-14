-- TAR-177: Games use the existing title-state/event journal model.  Platform is
-- deliberately event-owned private data: it is never copied from IGDB metadata.

-- Current local Supabase projects do not automatically expose RLS-protected
-- tables to the Data API roles. The existing Journal RPCs execute as their
-- authenticated invoker, so preserve their owner-scoped table access.
grant select, insert, update, delete on table public.journal_entries to authenticated;
grant select on table public.media_items to authenticated;
grant select on table public.journal_entries, public.journal_events, public.media_items to service_role;

alter table public.journal_events
add column if not exists played_on_platform text;

alter table public.journal_events
drop constraint if exists journal_events_played_on_platform_check;

alter table public.journal_events
add constraint journal_events_played_on_platform_check
check (
  played_on_platform is null
  or (char_length(played_on_platform) between 1 and 120
      and played_on_platform = btrim(played_on_platform))
);

-- The original v1.2 constraint correctly prohibited ratings on every
-- non-completed event. Games are the intentionally narrow exception: a user
-- can rate an active playthrough. A CHECK constraint cannot inspect the
-- related media item, so preserve the rule with a row trigger that can.
alter table public.journal_events
drop constraint if exists journal_events_completed_rating_check;

create or replace function public.enforce_journal_event_rating_media_rule()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.rating is null or new.event_type = 'completed' then
    return new;
  end if;

  if new.event_type = 'started' and exists (
    select 1
    from public.journal_entries as entry
    join public.media_items as media on media.id = entry.media_item_id
    where entry.id = new.journal_entry_id
      and entry.user_id = new.user_id
      and media.media_type = 'game'
  ) then
    return new;
  end if;

  raise exception 'Only completed events can have a rating, except an active game play.'
    using errcode = '22023';
end;
$$;

drop trigger if exists enforce_journal_event_rating_media_rule on public.journal_events;
create trigger enforce_journal_event_rating_media_rule
before insert or update of journal_entry_id, user_id, event_type, rating
on public.journal_events
for each row
execute function public.enforce_journal_event_rating_media_rule();

create or replace function public.journal_log_game_event(
  p_media_item_id uuid,
  p_event_type text,
  p_event_date date,
  p_rating numeric,
  p_notes text,
  p_resolve_active_plan boolean,
  p_request_id uuid,
  p_today date,
  p_played_on_platform text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_platform text := nullif(btrim(p_played_on_platform), '');
  v_normalized_notes text := nullif(btrim(p_notes), '');
  v_entry public.journal_entries%rowtype;
  v_event public.journal_events%rowtype;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.media_items
    where id = p_media_item_id and media_type = 'game'
  ) then
    raise exception 'Game Journal activity requires a game title.' using errcode = '22023';
  end if;

  if v_platform is not null and char_length(v_platform) > 120 then
    raise exception 'Played on must be 120 characters or fewer.' using errcode = '22023';
  end if;

  -- A started game may carry an in-progress rating. The existing RPC remains
  -- unchanged for every non-game lifecycle and supplies its durable operation
  -- ID / plan-resolution transaction.
  if p_event_type not in ('started', 'completed', 'stopped') then
    raise exception 'Unsupported Journal event type.' using errcode = '22023';
  end if;
  if p_event_type = 'stopped' and p_rating is not null then
    raise exception 'Only completed or started game events can have a rating.' using errcode = '22023';
  end if;

  -- This serializes the whole idempotent operation, including the follow-up
  -- platform/rating update below. Without it, two same-request calls can both
  -- observe no event and the losing call reaches the generic RPC mid-update.
  perform pg_advisory_xact_lock(
    hashtextextended(v_user_id::text || ':' || p_request_id::text, 0)
  );

  select * into v_entry
  from public.journal_entries
  where user_id = v_user_id
    and media_item_id = p_media_item_id;

  select * into v_event
  from public.journal_events
  where user_id = v_user_id and operation_id = p_request_id;

  if found then
    if v_entry.id is null
      or v_event.journal_entry_id <> v_entry.id
      or v_event.event_type <> p_event_type
      or v_event.event_date <> p_event_date
      or v_event.rating is distinct from p_rating
      or v_event.notes is distinct from v_normalized_notes
      or v_event.resolved_active_plan <> p_resolve_active_plan
      or v_event.played_on_platform is distinct from v_platform then
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

  v_result := public.journal_log_event(
    p_media_item_id,
    p_event_type,
    p_event_date,
    case when p_event_type = 'started' then null else p_rating end,
    p_notes,
    p_resolve_active_plan,
    p_request_id,
    p_today
  );

  update public.journal_events
  set rating = p_rating, played_on_platform = v_platform
  where id = (v_result->>'event_id')::uuid
    and user_id = v_user_id;

  return v_result;
end;
$$;

create or replace function public.journal_update_game_event(
  p_event_id uuid,
  p_event_date date,
  p_rating numeric,
  p_notes text,
  p_today date,
  p_played_on_platform text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_event_type text;
  v_platform text := nullif(btrim(p_played_on_platform), '');
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  if v_platform is not null and char_length(v_platform) > 120 then
    raise exception 'Played on must be 120 characters or fewer.' using errcode = '22023';
  end if;

  select event.event_type into v_event_type
  from public.journal_events as event
  join public.journal_entries as entry
    on entry.id = event.journal_entry_id and entry.user_id = event.user_id
  join public.media_items as media on media.id = entry.media_item_id
  where event.id = p_event_id and event.user_id = v_user_id and media.media_type = 'game';

  if not found then
    raise exception 'Game Journal event not found.' using errcode = 'P0002';
  end if;
  if v_event_type = 'stopped' and p_rating is not null then
    raise exception 'Only completed or started game events can have a rating.' using errcode = '22023';
  end if;

  v_result := public.journal_update_event(
    p_event_id,
    p_event_date,
    case when v_event_type = 'started' then null else p_rating end,
    p_notes,
    p_today
  );

  update public.journal_events
  set rating = p_rating, played_on_platform = v_platform
  where id = p_event_id and user_id = v_user_id;

  return v_result;
end;
$$;

revoke execute on function public.journal_log_game_event(uuid, text, date, numeric, text, boolean, uuid, date, text) from public, anon;
revoke execute on function public.journal_update_game_event(uuid, date, numeric, text, date, text) from public, anon;
grant execute on function public.journal_log_game_event(uuid, text, date, numeric, text, boolean, uuid, date, text) to authenticated;
grant execute on function public.journal_update_game_event(uuid, date, numeric, text, date, text) to authenticated;

-- Game mutations have an Edge-owned capability gate. Direct authenticated RPC
-- calls are denied (including the generic RPC path by the event trigger),
-- while the server-only wrappers below receive a verified user ID from Edge.
-- When Games is off, existing private records remain readable. New or changed
-- game events and plans are denied; delete/remove-plan remains a deliberate
-- privacy and user-control exception, rather than locking users into history.
create or replace function public.enforce_game_journal_mutation_boundary()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_media_type text;
begin
  select media.media_type into v_media_type
  from public.journal_entries as entry
  join public.media_items as media on media.id = entry.media_item_id
  where entry.id = new.journal_entry_id
    and entry.user_id = new.user_id;

  if new.played_on_platform is not null and v_media_type is distinct from 'game' then
    raise exception 'Played on platform is only available for games.' using errcode = '22023';
  end if;

  if v_media_type = 'game' and (select auth.role()) <> 'service_role' then
    raise exception 'Game Journal updates must use the secure Games service.' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_game_journal_mutation_boundary on public.journal_events;
create trigger enforce_game_journal_mutation_boundary
before insert or update
on public.journal_events
for each row
execute function public.enforce_game_journal_mutation_boundary();

create or replace function public.enforce_game_journal_entry_boundary()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_media_item_id uuid := coalesce(new.media_item_id, old.media_item_id);
  v_expected_status text;
  v_latest_event_type text;
begin
  if tg_op = 'UPDATE' and new.media_item_id is distinct from old.media_item_id then
    raise exception 'A Journal title cannot be reassigned to another media item.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.media_items where id = v_media_item_id and media_type = 'game'
  ) or (select auth.role()) = 'service_role' then
    return new;
  end if;

  -- The only authenticated mutation retained while Games is disabled is the
  -- canonical remove-plan transition. Keep it exact: clearing a plan cannot
  -- be bundled with a rating, review, status, or any other Journal rewrite.
  if tg_op = 'UPDATE' and old.has_active_plan and not new.has_active_plan then
    select event.event_type into v_latest_event_type
    from public.journal_events as event
    where event.journal_entry_id = old.id and event.user_id = old.user_id
    order by event.event_date desc, event.created_at desc, event.id desc
    limit 1;

    v_expected_status := case v_latest_event_type
      when 'started' then 'in_progress'
      when 'completed' then 'completed'
      when 'stopped' then 'dropped'
      else case when old.undated_completed_count > 0 then 'completed' else old.effective_status end
    end;

    if new.planned_for is null
      and new.status = v_expected_status
      and new.effective_status = v_expected_status
      and new.id = old.id
      and new.user_id = old.user_id
      and new.media_item_id = old.media_item_id
      and new.rating is not distinct from old.rating
      and new.review_headline is not distinct from old.review_headline
      and new.review_body is not distinct from old.review_body
      and new.contains_spoilers is not distinct from old.contains_spoilers
      and new.started_on is not distinct from old.started_on
      and new.completed_on is not distinct from old.completed_on
      and new.last_activity_at is not distinct from old.last_activity_at
      and new.created_at is not distinct from old.created_at
      and new.updated_at is not distinct from old.updated_at
      and new.undated_completed_count = old.undated_completed_count
      and new.legacy_bridge_statement_at is not distinct from old.legacy_bridge_statement_at
      and new.legacy_plan_resolution_statement_at is not distinct from old.legacy_plan_resolution_statement_at then
      return new;
    end if;
  end if;

  raise exception 'Game Journal updates must use the secure Games service.' using errcode = '42501';
end;
$$;

drop trigger if exists enforce_game_journal_entry_boundary on public.journal_entries;
create trigger enforce_game_journal_entry_boundary
before insert or update on public.journal_entries
for each row execute function public.enforce_game_journal_entry_boundary();

create or replace function public.journal_server_log_game_event(
  p_user_id uuid,
  p_media_item_id uuid,
  p_event_type text,
  p_event_date date,
  p_rating numeric,
  p_notes text,
  p_resolve_active_plan boolean,
  p_request_id uuid,
  p_today date,
  p_played_on_platform text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) <> 'service_role' or p_user_id is null then
    raise exception 'Game Journal service access required.' using errcode = '42501';
  end if;
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  return public.journal_log_game_event(
    p_media_item_id, p_event_type, p_event_date, p_rating, p_notes,
    p_resolve_active_plan, p_request_id, p_today, p_played_on_platform
  );
end;
$$;

create or replace function public.journal_server_update_game_event(
  p_user_id uuid,
  p_event_id uuid,
  p_event_date date,
  p_rating numeric,
  p_notes text,
  p_today date,
  p_played_on_platform text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) <> 'service_role' or p_user_id is null then
    raise exception 'Game Journal service access required.' using errcode = '42501';
  end if;
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  return public.journal_update_game_event(
    p_event_id, p_event_date, p_rating, p_notes, p_today, p_played_on_platform
  );
end;
$$;

create or replace function public.journal_server_save_game_plan(
  p_user_id uuid,
  p_media_item_id uuid,
  p_planned_for date,
  p_today date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) <> 'service_role' or p_user_id is null then
    raise exception 'Game Journal service access required.' using errcode = '42501';
  end if;
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  return public.journal_save_plan(p_media_item_id, p_planned_for, p_today);
end;
$$;

-- Deleting private game history is intentionally available while the Games
-- capability is off. The secure wrapper is still required because deleting an
-- event updates the canonical title projection in the same transaction.
create or replace function public.journal_server_delete_game_event(
  p_user_id uuid,
  p_event_id uuid,
  p_empty_title_action text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) <> 'service_role' or p_user_id is null then
    raise exception 'Game Journal service access required.' using errcode = '42501';
  end if;
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  return public.journal_delete_event(p_event_id, p_empty_title_action);
end;
$$;

revoke execute on function public.journal_log_game_event(uuid, text, date, numeric, text, boolean, uuid, date, text) from authenticated;
revoke execute on function public.journal_update_game_event(uuid, date, numeric, text, date, text) from authenticated;
revoke execute on function public.journal_server_log_game_event(uuid, uuid, text, date, numeric, text, boolean, uuid, date, text) from public, anon, authenticated;
revoke execute on function public.journal_server_update_game_event(uuid, uuid, date, numeric, text, date, text) from public, anon, authenticated;
revoke execute on function public.journal_server_save_game_plan(uuid, uuid, date, date) from public, anon, authenticated;
revoke execute on function public.journal_server_delete_game_event(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.journal_server_log_game_event(uuid, uuid, text, date, numeric, text, boolean, uuid, date, text) to service_role;
grant execute on function public.journal_server_update_game_event(uuid, uuid, date, numeric, text, date, text) to service_role;
grant execute on function public.journal_server_save_game_plan(uuid, uuid, date, date) to service_role;
grant execute on function public.journal_server_delete_game_event(uuid, uuid, text) to service_role;

revoke execute on function public.enforce_journal_event_rating_media_rule() from public, anon, authenticated;
revoke execute on function public.enforce_game_journal_mutation_boundary() from public, anon, authenticated;
revoke execute on function public.enforce_game_journal_entry_boundary() from public, anon, authenticated;

-- Keep the legacy projection read model honest: the latest started game owns
-- the active rating, while every non-game started event remains unrated.
create or replace function public.journal_bridge_event_after()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_entry_id uuid := coalesce(new.journal_entry_id, old.journal_entry_id);
  v_user_id uuid := coalesce(new.user_id, old.user_id);
  v_is_game boolean := false;
  v_latest public.journal_events%rowtype;
begin
  select media.media_type = 'game' into v_is_game
  from public.journal_entries as entry
  join public.media_items as media on media.id = entry.media_item_id
  where entry.id = v_entry_id and entry.user_id = v_user_id;

  select * into v_latest
  from public.journal_events
  where journal_entry_id = v_entry_id and user_id = v_user_id
  order by event_date desc, created_at desc, id desc
  limit 1;

  if not found then
    update public.journal_entries set
      effective_status = case when undated_completed_count > 0 then 'completed' else 'planned' end,
      status = case when has_active_plan then 'planned' when undated_completed_count > 0 then 'completed' else 'planned' end,
      started_on = case when has_active_plan then planned_for else null end,
      completed_on = null, rating = null, review_headline = null, review_body = null,
      contains_spoilers = false
    where id = v_entry_id and user_id = v_user_id;
    return null;
  end if;

  update public.journal_entries set
    effective_status = case v_latest.event_type when 'started' then 'in_progress' when 'completed' then 'completed' when 'stopped' then 'dropped' end,
    status = case when has_active_plan then 'planned' when v_latest.event_type = 'started' then 'in_progress' when v_latest.event_type = 'completed' then 'completed' when v_latest.event_type = 'stopped' then 'dropped' end,
    started_on = case when has_active_plan then planned_for when v_latest.event_type in ('started', 'stopped') then v_latest.event_date else null end,
    completed_on = case when not has_active_plan and v_latest.event_type = 'completed' then v_latest.event_date else null end,
    rating = case
      when v_latest.event_type = 'completed' then v_latest.rating
      when v_latest.event_type = 'started' and v_is_game then v_latest.rating
      when v_latest.is_legacy_mirror then rating
      else null
    end,
    review_headline = case when v_latest.is_legacy_mirror then review_headline else null end,
    review_body = v_latest.notes,
    contains_spoilers = case when v_latest.is_legacy_mirror then contains_spoilers else false end,
    legacy_bridge_statement_at = statement_timestamp()
  where id = v_entry_id and user_id = v_user_id;
  return null;
end;
$$;

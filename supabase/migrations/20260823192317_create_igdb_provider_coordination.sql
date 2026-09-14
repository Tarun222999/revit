create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table private.igdb_provider_state (
  singleton boolean primary key default true check (singleton),
  access_token text,
  token_expires_at timestamptz,
  token_refresh_lease_id uuid,
  token_refresh_lease_until timestamptz,
  updated_at timestamptz not null default now(),
  constraint igdb_provider_state_access_token_length
    check (access_token is null or char_length(access_token) between 1 and 4096),
  constraint igdb_provider_state_token_pair
    check ((access_token is null) = (token_expires_at is null)),
  constraint igdb_provider_state_refresh_lease_pair
    check ((token_refresh_lease_id is null) = (token_refresh_lease_until is null))
);

create table private.igdb_request_leases (
  id uuid primary key default gen_random_uuid(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table private.igdb_request_starts (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default clock_timestamp()
);

create index igdb_request_starts_started_at_idx
on private.igdb_request_starts (started_at);

revoke all on table private.igdb_provider_state from public, anon, authenticated;
revoke all on table private.igdb_request_leases from public, anon, authenticated;
revoke all on table private.igdb_request_starts from public, anon, authenticated;

create or replace function public.igdb_claim_token_refresh()
returns table (
  action text,
  access_token text,
  expires_at timestamptz,
  refresh_lease_id uuid,
  retry_after_ms integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state private.igdb_provider_state%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('revit:igdb:token-refresh', 0)
  );

  insert into private.igdb_provider_state (singleton)
  values (true)
  on conflict (singleton) do nothing;

  select *
  into v_state
  from private.igdb_provider_state
  where singleton = true
  for update;

  if v_state.access_token is not null
     and v_state.token_expires_at > v_now + interval '60 seconds' then
    return query
    select
      'ready'::text,
      v_state.access_token,
      v_state.token_expires_at,
      null::uuid,
      0;
    return;
  end if;

  if v_state.token_refresh_lease_until > v_now then
    return query
    select
      'wait'::text,
      null::text,
      null::timestamptz,
      null::uuid,
      greatest(
        50,
        least(
          1000,
          ceil(extract(epoch from (v_state.token_refresh_lease_until - v_now)) * 1000)::integer
        )
      );
    return;
  end if;

  update private.igdb_provider_state
  set token_refresh_lease_id = gen_random_uuid(),
      token_refresh_lease_until = v_now + interval '15 seconds',
      updated_at = v_now
  where singleton = true;

  return query
  select
    'refresh'::text,
    null::text,
    null::timestamptz,
    token_refresh_lease_id,
    0
  from private.igdb_provider_state
  where singleton = true;
end;
$$;

create or replace function public.igdb_store_token(
  p_refresh_lease_id uuid,
  p_access_token text,
  p_expires_in_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_access_token is null
     or char_length(p_access_token) not between 1 and 4096
     or p_expires_in_seconds is null
     or p_expires_in_seconds not between 60 and 31536000 then
    raise exception 'Invalid IGDB token response.' using errcode = '22023';
  end if;

  update private.igdb_provider_state
  set access_token = p_access_token,
      token_expires_at = clock_timestamp() + pg_catalog.make_interval(secs => p_expires_in_seconds),
      token_refresh_lease_id = null,
      token_refresh_lease_until = null,
      updated_at = clock_timestamp()
  where singleton = true
    and token_refresh_lease_id = p_refresh_lease_id
    and token_refresh_lease_until > clock_timestamp();

  return found;
end;
$$;

create or replace function public.igdb_release_token_refresh(p_refresh_lease_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update private.igdb_provider_state
  set token_refresh_lease_id = null,
      token_refresh_lease_until = null,
      updated_at = clock_timestamp()
  where singleton = true
    and token_refresh_lease_id = p_refresh_lease_id;
$$;

create or replace function public.igdb_invalidate_token(p_access_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  update private.igdb_provider_state
  set access_token = null,
      token_expires_at = null,
      updated_at = clock_timestamp()
  where singleton = true
    and access_token = p_access_token;
$$;

create or replace function public.igdb_acquire_request_slot()
returns table (
  lease_id uuid,
  retry_after_ms integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_in_flight integer;
  v_recent_starts integer;
  v_lease_id uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('revit:igdb:request-slot', 0)
  );

  insert into private.igdb_provider_state (singleton)
  values (true)
  on conflict (singleton) do nothing;

  delete from private.igdb_request_leases
  where expires_at <= v_now;

  delete from private.igdb_request_starts
  where started_at <= v_now - interval '1 second';

  select count(*)::integer
  into v_in_flight
  from private.igdb_request_leases;

  select count(*)::integer
  into v_recent_starts
  from private.igdb_request_starts;

  -- IGDB permits four request starts per second. Keep one request of headroom.
  if v_recent_starts >= 3 then
    return query
    select
      null::uuid,
      greatest(
        25,
        ceil(
          extract(epoch from (
            (select min(started_at) from private.igdb_request_starts)
            + interval '1 second'
            - v_now
          )) * 1000
        )::integer
      );
    return;
  end if;

  if v_in_flight >= 8 then
    return query select null::uuid, 100;
    return;
  end if;

  insert into private.igdb_request_leases (expires_at)
  values (v_now + interval '30 seconds')
  returning id into v_lease_id;

  insert into private.igdb_request_starts (started_at) values (v_now);

  return query select v_lease_id, 0;
end;
$$;

create or replace function public.igdb_release_request_slot(p_lease_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from private.igdb_request_leases where id = p_lease_id;
$$;

revoke all on function public.igdb_claim_token_refresh() from public, anon, authenticated;
revoke all on function public.igdb_store_token(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.igdb_release_token_refresh(uuid) from public, anon, authenticated;
revoke all on function public.igdb_invalidate_token(text) from public, anon, authenticated;
revoke all on function public.igdb_acquire_request_slot() from public, anon, authenticated;
revoke all on function public.igdb_release_request_slot(uuid) from public, anon, authenticated;

grant execute on function public.igdb_claim_token_refresh() to service_role;
grant execute on function public.igdb_store_token(uuid, text, integer) to service_role;
grant execute on function public.igdb_release_token_refresh(uuid) to service_role;
grant execute on function public.igdb_invalidate_token(text) to service_role;
grant execute on function public.igdb_acquire_request_slot() to service_role;
grant execute on function public.igdb_release_request_slot(uuid) to service_role;

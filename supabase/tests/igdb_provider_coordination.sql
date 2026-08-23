begin;

create or replace function pg_temp.assert_true(value boolean, message text)
returns void
language plpgsql
as $$
begin
  if value is not true then
    raise exception 'Assertion failed: %', message;
  end if;
end;
$$;

select pg_temp.assert_true(
  not has_schema_privilege('anon', 'private', 'usage')
  and not has_schema_privilege('authenticated', 'private', 'usage'),
  'client roles can access the private IGDB schema'
);

select pg_temp.assert_true(
  not has_function_privilege('anon', 'public.igdb_claim_token_refresh()', 'execute')
  and not has_function_privilege('authenticated', 'public.igdb_claim_token_refresh()', 'execute')
  and has_function_privilege('service_role', 'public.igdb_claim_token_refresh()', 'execute'),
  'token coordination privileges are not service-role-only'
);

create temporary table acquired_token_leases (
  name text primary key,
  id uuid not null
);

insert into acquired_token_leases
select 'initial', refresh_lease_id
from public.igdb_claim_token_refresh()
where action = 'refresh';
select pg_temp.assert_true(
  (select count(*) = 1 from acquired_token_leases where name = 'initial'),
  'first cold-start caller did not receive a fenced refresh lease'
);
select pg_temp.assert_true(
  (select action = 'wait' and retry_after_ms > 0 from public.igdb_claim_token_refresh()),
  'second cold-start caller was not coordinated behind the refresh lease'
);

select pg_temp.assert_true(
  public.igdb_store_token(
    (select id from acquired_token_leases where name = 'initial'),
    'fixture-token',
    3600
  ),
  'refresh owner could not store its token'
);
select pg_temp.assert_true(
  (
    select action = 'ready'
      and access_token = 'fixture-token'
      and expires_at > now() + interval '59 minutes'
    from public.igdb_claim_token_refresh()
  ),
  'stored token was not reused'
);

select public.igdb_invalidate_token('different-token');
select pg_temp.assert_true(
  (select action = 'ready' from public.igdb_claim_token_refresh()),
  'a stale authentication failure invalidated a newer token'
);

select public.igdb_invalidate_token('fixture-token');
insert into acquired_token_leases
select 'stale', refresh_lease_id
from public.igdb_claim_token_refresh()
where action = 'refresh';

update private.igdb_provider_state
set token_refresh_lease_until = clock_timestamp() - interval '1 millisecond';

select pg_temp.assert_true(
  not public.igdb_store_token(
    (select id from acquired_token_leases where name = 'stale'),
    'expired-owner-token',
    3600
  ),
  'expired refresh owner stored after its fence elapsed'
);

insert into acquired_token_leases
select 'successor', refresh_lease_id
from public.igdb_claim_token_refresh()
where action = 'refresh';

select public.igdb_release_token_refresh(
  (select id from acquired_token_leases where name = 'stale')
);
select pg_temp.assert_true(
  (select action = 'wait' from public.igdb_claim_token_refresh()),
  'stale refresh owner released its successor lease'
);
select pg_temp.assert_true(
  not public.igdb_store_token(
    (select id from acquired_token_leases where name = 'stale'),
    'stale-token',
    3600
  ),
  'stale refresh owner overwrote its successor'
);
select pg_temp.assert_true(
  public.igdb_store_token(
    (select id from acquired_token_leases where name = 'successor'),
    'successor-token',
    3600
  ),
  'current refresh owner could not store its token'
);

do $$
begin
  perform public.igdb_store_token(gen_random_uuid(), 'invalid-token', null);
  raise exception 'NULL token lifetime was accepted';
exception
  when sqlstate '22023' then null;
end;
$$;

-- Three distributed request starts per second leave headroom under IGDB's
-- four-start account limit.
create temporary table acquired_igdb_leases (id uuid primary key);
insert into acquired_igdb_leases
select lease_id from public.igdb_acquire_request_slot();
insert into acquired_igdb_leases
select lease_id from public.igdb_acquire_request_slot();
insert into acquired_igdb_leases
select lease_id from public.igdb_acquire_request_slot();

select pg_temp.assert_true(
  (select lease_id is null and retry_after_ms > 0 from public.igdb_acquire_request_slot()),
  'distributed start-rate headroom was not enforced'
);

update private.igdb_request_starts
set started_at = clock_timestamp() - interval '900 milliseconds';
select pg_temp.assert_true(
  (select lease_id is null from public.igdb_acquire_request_slot()),
  'rolling start limiter allowed a boundary burst inside one second'
);

update private.igdb_request_starts
set started_at = clock_timestamp() - interval '1100 milliseconds';
insert into acquired_igdb_leases
select lease_id from public.igdb_acquire_request_slot();
select pg_temp.assert_true(
  (select count(*) = 4 from acquired_igdb_leases),
  'rolling start limiter did not release expired starts'
);

select public.igdb_release_request_slot(id) from acquired_igdb_leases;

-- Exercise the separate eight-in-flight ceiling while resetting only the
-- one-second start window between fixture acquisitions.
truncate table acquired_igdb_leases;
truncate table private.igdb_request_leases;
truncate table private.igdb_request_starts;

do $$
declare
  v_index integer;
  v_lease_id uuid;
begin
  for v_index in 1..8 loop
    truncate table private.igdb_request_starts;

    select lease_id into v_lease_id
    from public.igdb_acquire_request_slot();
    insert into acquired_igdb_leases values (v_lease_id);
  end loop;
end;
$$;

truncate table private.igdb_request_starts;

select pg_temp.assert_true(
  (select lease_id is null and retry_after_ms = 100 from public.igdb_acquire_request_slot()),
  'distributed in-flight ceiling was not enforced'
);

select public.igdb_release_request_slot(id) from acquired_igdb_leases;

rollback;

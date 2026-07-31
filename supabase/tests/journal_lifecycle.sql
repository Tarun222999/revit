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

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  confirmed_at, created_at, updated_at
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'journal-one@example.test', '',
    now(), now(), now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'journal-two@example.test', '',
    now(), now(), now()
  );

insert into public.profiles (id, username, display_name)
values
  ('11111111-1111-4111-8111-111111111111', 'journal_one', 'Journal One'),
  ('22222222-2222-4222-8222-222222222222', 'journal_two', 'Journal Two');

insert into public.media_items (
  id, source, source_id, media_type, title, genres, metadata
)
select
  ('aaaaaaaa-aaaa-4aaa-8aaa-' || lpad(value::text, 12, '0'))::uuid,
  'tmdb',
  'movie:' || value,
  'movie',
  'Lifecycle title ' || value,
  '[]'::jsonb,
  '{}'::jsonb
from generate_series(1, 10) as value;

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

-- Plans are title state, not activity. Save, reschedule, Someday, and remove
-- must never create a journal event.
select public.journal_save_plan(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000001', null, '2026-07-29'
);
select public.journal_save_plan(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000001', '2026-08-02', '2026-07-29'
);
select public.journal_save_plan(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000001', null, '2026-07-29'
);
select pg_temp.assert_true(
  (select count(*) = 0 from public.journal_events),
  'plan changes created false activity'
);
select public.journal_remove_plan(
  (select id from public.journal_entries where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001')
);
select pg_temp.assert_true(
  not exists (
    select 1 from public.journal_entries
    where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001'
  ),
  'removing the only plan did not remove the empty title'
);

-- First watch, retry, rewatch, previous watch, start, stop, and resume all use
-- one title row and independent event rows.
select public.journal_log_event(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000002', 'completed', '2026-07-28',
  4.0, 'First watch', false,
  '10000000-0000-4000-8000-000000000001', '2026-07-29'
);
select pg_temp.assert_true(
  (public.journal_log_event(
    'aaaaaaaa-aaaa-4aaa-8aaa-000000000002', 'completed', '2026-07-28',
    4.0, 'First watch', false,
    '10000000-0000-4000-8000-000000000001', '2026-07-29'
  )->>'idempotent_replay')::boolean,
  'replayed request did not return its original event'
);
select public.journal_log_event(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000002', 'completed', '2026-07-29',
  4.5, 'Rewatch', false,
  '10000000-0000-4000-8000-000000000002', '2026-07-29'
);
select public.journal_save_plan(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000002', '2026-08-05', '2026-07-29'
);
select public.journal_log_event(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000002', 'completed', '2026-07-01',
  null, 'Earlier watch', false,
  '10000000-0000-4000-8000-000000000003', '2026-07-29'
);
select pg_temp.assert_true(
  (select has_active_plan and planned_for = '2026-08-05'
   from public.journal_entries
   where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000002'),
  'adding previous history changed the future plan'
);
select public.journal_log_event(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000002', 'started', '2026-07-29',
  null, null, false,
  '10000000-0000-4000-8000-000000000004', '2026-07-29'
);
select public.journal_log_event(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000002', 'stopped', '2026-07-29',
  null, 'Paused', false,
  '10000000-0000-4000-8000-000000000005', '2026-07-29'
);
select public.journal_log_event(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000002', 'started', '2026-07-29',
  null, 'Resumed', false,
  '10000000-0000-4000-8000-000000000006', '2026-07-29'
);
select pg_temp.assert_true(
  (select status = 'in_progress' from public.journal_entries
   where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000002'),
  'resume did not become the current state'
);
select pg_temp.assert_true(
  (select count(*) = 6 from public.journal_events
   where journal_entry_id = (
     select id from public.journal_entries
     where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000002'
   )),
  'retry duplicated an event or lifecycle events were lost'
);

-- Moving the latest event earlier recomputes status without changing the plan.
select public.journal_update_event(
  (select id from public.journal_events
   where operation_id = '10000000-0000-4000-8000-000000000006'),
  '2026-06-30', null, 'Resumed earlier', '2026-07-29'
);
select pg_temp.assert_true(
  (select status = 'dropped' and has_active_plan and planned_for = '2026-08-05'
   from public.journal_entries
   where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000002'),
  'event edit did not recompute state or changed the plan'
);
select public.journal_delete_event(
  (select id from public.journal_events
   where operation_id = '10000000-0000-4000-8000-000000000005'),
  null
);
select pg_temp.assert_true(
  (select status = 'in_progress' and has_active_plan
   from public.journal_entries
   where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000002'),
  'deleting one event did not preserve history/plan or recompute state'
);

-- Logging from a plan resolves it atomically; retrying cannot add a watch.
select public.journal_save_plan(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000003', '2026-08-01', '2026-07-29'
);
select public.journal_log_event(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000003', 'completed', '2026-07-29',
  5.0, null, true,
  '10000000-0000-4000-8000-000000000007', '2026-07-29'
);
select pg_temp.assert_true(
  (select status = 'completed' and not has_active_plan and planned_for is null
   from public.journal_entries
   where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000003'),
  'planned completion did not resolve its active plan'
);
select public.journal_log_event(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000003', 'completed', '2026-07-29',
  5.0, null, true,
  '10000000-0000-4000-8000-000000000007', '2026-07-29'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.journal_events
   where operation_id = '10000000-0000-4000-8000-000000000007'),
  'planned completion retry created a duplicate watch'
);
select pg_temp.assert_true(
  (public.journal_remove_plan(
    (select id from public.journal_entries
     where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000003')
  )->>'idempotent_replay')::boolean,
  'repeated plan removal was not treated as a safe no-op'
);
select pg_temp.assert_true(
  exists (
    select 1 from public.journal_entries
    where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000003'
      and status = 'completed'
  ),
  'repeated plan removal deleted a completed title'
);

-- A failed event insert rolls back the title insert as part of the same RPC.
do $$
begin
  perform public.journal_log_event(
    'aaaaaaaa-aaaa-4aaa-8aaa-000000000004', 'completed', '2026-07-29',
    6.0, null, false,
    '10000000-0000-4000-8000-000000000008', '2026-07-29'
  );
  raise exception 'Expected invalid rating failure.';
exception
  when check_violation then null;
end;
$$;
select pg_temp.assert_true(
  not exists (
    select 1 from public.journal_entries
    where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000004'
  ),
  'failed event left a partial title row'
);

-- Deleting the final event requires an explicit keep/remove choice, and the
-- failed undecided call must leave the event intact.
select public.journal_log_event(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000005', 'completed', '2026-07-29',
  null, null, false,
  '10000000-0000-4000-8000-000000000009', '2026-07-29'
);
do $$
begin
  perform public.journal_delete_event(
    (select id from public.journal_events
     where operation_id = '10000000-0000-4000-8000-000000000009'),
    null
  );
  raise exception 'Expected empty-title decision failure.';
exception
  when invalid_parameter_value then null;
end;
$$;
select pg_temp.assert_true(
  exists (
    select 1 from public.journal_events
    where operation_id = '10000000-0000-4000-8000-000000000009'
  ),
  'failed delete did not roll back the event removal'
);
select public.journal_delete_event(
  (select id from public.journal_events
   where operation_id = '10000000-0000-4000-8000-000000000009'),
  'keep_someday'
);
select pg_temp.assert_true(
  (select status = 'planned' and has_active_plan and planned_for is null
   from public.journal_entries
   where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000005'),
  'keep Someday choice did not preserve the title'
);

select public.journal_log_event(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000006', 'completed', '2026-07-29',
  null, null, false,
  '10000000-0000-4000-8000-000000000010', '2026-07-29'
);
select public.journal_delete_event(
  (select id from public.journal_events
   where operation_id = '10000000-0000-4000-8000-000000000010'),
  'remove'
);
select pg_temp.assert_true(
  not exists (
    select 1 from public.journal_entries
    where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000006'
  ),
  'remove choice did not delete the empty title'
);

-- Complete title removal cascades all events and reports its consequences.
select public.journal_save_plan(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000007', '2026-08-10', '2026-07-29'
);
select public.journal_log_event(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000007', 'completed', '2026-07-20',
  3.5, null, false,
  '10000000-0000-4000-8000-000000000011', '2026-07-29'
);
select public.journal_log_event(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000007', 'completed', '2026-07-21',
  4.0, null, false,
  '10000000-0000-4000-8000-000000000012', '2026-07-29'
);
select pg_temp.assert_true(
  (public.journal_remove_title(
    (select id from public.journal_entries
     where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000007')
  )->>'completed_count')::integer = 2,
  'title removal did not report completed watch count'
);
select pg_temp.assert_true(
  not exists (
    select 1 from public.journal_events
    where operation_id in (
      '10000000-0000-4000-8000-000000000011',
      '10000000-0000-4000-8000-000000000012'
    )
  ),
  'title removal did not cascade history'
);

-- Two independent requests for one media item may add two events, but the
-- database uniqueness contract keeps exactly one title-state row.
select public.journal_log_event(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000008', 'completed', '2026-07-27',
  null, null, false,
  '10000000-0000-4000-8000-000000000013', '2026-07-29'
);
select public.journal_log_event(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000008', 'completed', '2026-07-28',
  null, null, false,
  '10000000-0000-4000-8000-000000000014', '2026-07-29'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.journal_entries
   where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000008'),
  'independent requests created duplicate title rows'
);

-- Installed v1 clients remain coherent with v1.1 plan and event storage.
insert into public.journal_entries (
  user_id, media_item_id, status, started_on
)
values (
  '11111111-1111-4111-8111-111111111111',
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000009',
  'planned',
  '2026-09-05'
);
select pg_temp.assert_true(
  (select has_active_plan and planned_for = '2026-09-05'
   from public.journal_entries
   where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000009'),
  'a v1 plan did not reach the v1.1 Planner fields'
);
update public.journal_entries
set
  status = 'completed',
  started_on = null,
  completed_on = '2026-07-15',
  rating = 3.5,
  review_body = 'Legacy watch'
where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000009';
select pg_temp.assert_true(
  (select count(*) = 1
   from public.journal_events
   where journal_entry_id = (
     select id from public.journal_entries
     where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000009'
   ) and is_legacy_mirror and event_date = '2026-07-15'),
  'a dated v1 completion did not create its v1.1 event mirror'
);
select public.journal_log_event(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000009', 'completed', '2026-07-29',
  4.5, 'v1.1 rewatch', false,
  '10000000-0000-4000-8000-000000000015', '2026-07-29'
);
select pg_temp.assert_true(
  (select status = 'completed'
      and completed_on = '2026-07-29'
      and rating = 4.5
      and review_body = 'v1.1 rewatch'
   from public.journal_entries
   where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000009'),
  'a v1.1 event did not refresh the legacy v1 fields'
);
select pg_temp.assert_true(
  (select count(*) = 2
   from public.journal_events
   where journal_entry_id = (
     select id from public.journal_entries
     where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000009'
   )),
  'the compatibility bridge lost or duplicated a watch'
);
create temporary table expected_legacy_plan_history
on commit drop
as
select id, event_date
from public.journal_events
where journal_entry_id = (
  select id from public.journal_entries
  where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000009'
)
  and event_type = 'completed';
update public.journal_entries
set status = 'planned', started_on = '2026-09-20'
where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000009';
select pg_temp.assert_true(
  (select status = 'completed'
      and has_active_plan
      and planned_for = '2026-09-20'
      and completed_on = '2026-07-29'
      and undated_completed_count = 0
   from public.journal_entries
   where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000009'),
  'a v1 rewatch plan replaced completed v1.1 title semantics'
);
select pg_temp.assert_true(
  not exists (
    (select id, event_date from expected_legacy_plan_history
     except
     select id, event_date
     from public.journal_events
     where journal_entry_id = (
       select id from public.journal_entries
       where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000009'
     ) and event_type = 'completed')
    union all
    (select id, event_date
     from public.journal_events
     where journal_entry_id = (
       select id from public.journal_entries
       where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000009'
     ) and event_type = 'completed'
     except
     select id, event_date from expected_legacy_plan_history)
  ),
  'a v1 rewatch plan changed completed event IDs or dates'
);
select public.journal_remove_plan(
  (select id from public.journal_entries
   where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000009')
);
select pg_temp.assert_true(
  (select status = 'completed'
      and not has_active_plan
      and planned_for is null
      and completed_on = '2026-07-29'
      and undated_completed_count = 0
   from public.journal_entries
   where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000009'),
  'removing a v1 rewatch plan did not preserve completed title semantics'
);
select pg_temp.assert_true(
  (select count(*) = 2
      and array_agg(event_date order by event_date) =
        array['2026-07-15'::date, '2026-07-29'::date]
   from public.journal_events
   where journal_entry_id = (
     select id from public.journal_entries
     where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000009'
   ) and event_type = 'completed'),
  'removing a v1 rewatch plan changed completed history count or dates'
);
select pg_temp.assert_true(
  not exists (
    (select id, event_date from expected_legacy_plan_history
     except
     select id, event_date
     from public.journal_events
     where journal_entry_id = (
       select id from public.journal_entries
       where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000009'
     ) and event_type = 'completed')
    union all
    (select id, event_date
     from public.journal_events
     where journal_entry_id = (
       select id from public.journal_entries
       where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000009'
     ) and event_type = 'completed'
     except
     select id, event_date from expected_legacy_plan_history)
  ),
  'removing a v1 rewatch plan changed completed event IDs or dates'
);

-- An old completion without completed_on remains an undated watch identity.
insert into public.journal_entries (
  user_id, media_item_id, status
)
values (
  '11111111-1111-4111-8111-111111111111',
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000010',
  'completed'
);
select pg_temp.assert_true(
  (select undated_completed_count = 1
   from public.journal_entries
   where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000010'),
  'an undated legacy completion did not keep its watch count'
);
select public.journal_log_event(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000010', 'completed', '2026-07-29',
  null, null, false,
  '10000000-0000-4000-8000-000000000016', '2026-07-29'
);
select pg_temp.assert_true(
  (select has_undated_completion
   from public.journal_get_completion_origins(array[
     (select id from public.journal_entries
      where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000010')
   ])),
  'Timeline origin lookup forgot the undated first completion'
);
select public.journal_delete_event(
  (select id from public.journal_events
   where operation_id = '10000000-0000-4000-8000-000000000016'),
  null
);
select pg_temp.assert_true(
  (select status = 'completed' and undated_completed_count = 1
   from public.journal_entries
   where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000010'),
  'deleting a dated rewatch discarded the undated legacy completion'
);
update public.journal_entries
set status = 'planned', started_on = '2026-09-25'
where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000010';
select public.journal_remove_plan(
  (select id from public.journal_entries
   where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000010')
);
select pg_temp.assert_true(
  (select status = 'completed'
      and not has_active_plan
      and undated_completed_count = 1
   from public.journal_entries
   where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000010'),
  'removing a legacy-written plan deleted its undated completion'
);
do $$
begin
  perform *
  from public.journal_get_completion_origins(
    array_fill('aaaaaaaa-aaaa-4aaa-8aaa-000000000010'::uuid, array[51])
  );
  raise exception 'Expected bounded completion-origin failure.';
exception
  when invalid_parameter_value then null;
end;
$$;

-- Another authenticated user cannot mutate this user's title or events.
set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select pg_temp.assert_true(
  (select count(*) = 0
   from public.journal_get_completion_origins(array[
     (select id from public.journal_entries
      where user_id = '11111111-1111-4111-8111-111111111111'
        and media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000010')
   ])),
  'completion-origin lookup exposed another user''s title'
);
do $$
begin
  perform public.journal_remove_title(
    (select id from public.journal_entries
     where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000002')
  );
  raise exception 'Expected cross-owner mutation failure.';
exception
  when no_data_found then null;
end;
$$;

reset role;
select pg_temp.assert_true(
  exists (
    select 1 from public.journal_entries
    where user_id = '11111111-1111-4111-8111-111111111111'
      and media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000002'
  ),
  'cross-owner mutation changed the title'
);

select pg_temp.assert_true(
  has_function_privilege('authenticated', 'public.journal_log_event(uuid,text,date,numeric,text,boolean,uuid,date)', 'EXECUTE'),
  'authenticated role cannot execute lifecycle RPC'
);
select pg_temp.assert_true(
  not has_function_privilege('anon', 'public.journal_log_event(uuid,text,date,numeric,text,boolean,uuid,date)', 'EXECUTE'),
  'anonymous role can execute lifecycle RPC'
);

rollback;

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
  created_at, updated_at
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'journal-one@example.test', '',
    now(), now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'journal-two@example.test', '',
    now(), now()
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
from generate_series(1, 28) as value;

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
  (select status = 'planned' and effective_status = 'in_progress'
   from public.journal_entries
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
  (select status = 'planned' and effective_status = 'dropped'
      and has_active_plan and planned_for = '2026-08-05'
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
  (select status = 'planned' and effective_status = 'in_progress'
      and has_active_plan
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
  (select status = 'planned'
      and effective_status = 'completed'
      and has_active_plan
      and planned_for = '2026-09-20'
      and started_on = '2026-09-20'
      and completed_on is null
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

-- A v1 activity transition resolves the plan that the same v1 client wrote,
-- while preserving the pre-plan completion as dated history. Exercise each
-- legacy activity shape used by the approved lifecycle.
insert into public.journal_entries (
  user_id, media_item_id, status, completed_on
)
select
  '11111111-1111-4111-8111-111111111111',
  ('aaaaaaaa-aaaa-4aaa-8aaa-' || lpad(value::text, 12, '0'))::uuid,
  'completed',
  '2026-07-15'::date
from generate_series(11, 13) as value;

create temporary table expected_same_v1_origins
on commit drop
as
select event.journal_entry_id, event.id, event.event_date
from public.journal_events as event
join public.journal_entries as entry on entry.id = event.journal_entry_id
where entry.media_item_id in (
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000011',
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000012',
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000013'
)
  and event.is_legacy_mirror;

update public.journal_entries
set status = 'planned', started_on = '2026-09-20'
where media_item_id in (
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000011',
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000012',
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000013'
);
select pg_temp.assert_true(
  (select count(*) = 3
   from public.journal_entries
   where media_item_id in (
     'aaaaaaaa-aaaa-4aaa-8aaa-000000000011',
     'aaaaaaaa-aaaa-4aaa-8aaa-000000000012',
     'aaaaaaaa-aaaa-4aaa-8aaa-000000000013'
   )
     and status = 'planned'
     and effective_status = 'completed'
     and has_active_plan
     and planned_for = '2026-09-20'),
  'same-v1-client setup did not preserve completed state with its plan'
);

update public.journal_entries
set
  status = case media_item_id
    when 'aaaaaaaa-aaaa-4aaa-8aaa-000000000011' then 'completed'
    when 'aaaaaaaa-aaaa-4aaa-8aaa-000000000012' then 'in_progress'
    when 'aaaaaaaa-aaaa-4aaa-8aaa-000000000013' then 'dropped'
  end,
  started_on = case
    when media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000011' then null
    else '2026-09-20'::date
  end,
  completed_on = case
    when media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000011'
      then '2026-09-20'::date
    else null
  end
where media_item_id in (
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000011',
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000012',
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000013'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from public.journal_entries as entry
    join (
      values
        ('aaaaaaaa-aaaa-4aaa-8aaa-000000000011'::uuid, 'completed'::text),
        ('aaaaaaaa-aaaa-4aaa-8aaa-000000000012'::uuid, 'in_progress'::text),
        ('aaaaaaaa-aaaa-4aaa-8aaa-000000000013'::uuid, 'dropped'::text)
    ) as expected(media_item_id, status)
      on expected.media_item_id = entry.media_item_id
    where entry.status <> expected.status
      or entry.effective_status <> expected.status
      or entry.has_active_plan
      or entry.planned_for is not null
      or entry.undated_completed_count <> 0
  ),
  'a same-v1-client activity transition did not resolve its bridged plan'
);
select pg_temp.assert_true(
  not exists (
    select 1
    from expected_same_v1_origins as expected
    left join public.journal_events as event
      on event.id = expected.id
      and event.journal_entry_id = expected.journal_entry_id
      and event.event_date = expected.event_date
    where event.id is null
  ),
  'resolving a same-v1-client plan changed its original event ID or date'
);
select pg_temp.assert_true(
  (select count(*) = 3
   from expected_same_v1_origins as expected
   join public.journal_events as event on event.id = expected.id
   where not event.is_legacy_mirror),
  'resolved legacy plans did not freeze their original mirrors as history'
);
select pg_temp.assert_true(
  (select count(*) = 3
   from public.journal_events as event
   join public.journal_entries as entry on entry.id = event.journal_entry_id
   where entry.media_item_id in (
     'aaaaaaaa-aaaa-4aaa-8aaa-000000000011',
     'aaaaaaaa-aaaa-4aaa-8aaa-000000000012',
     'aaaaaaaa-aaaa-4aaa-8aaa-000000000013'
   )
     and event.event_date = '2026-09-20'
     and event.is_legacy_mirror
     and (
       (entry.media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000011'
         and event.event_type = 'completed')
       or (entry.media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000012'
         and event.event_type = 'started')
       or (entry.media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000013'
         and event.event_type = 'stopped')
     )),
  'same-v1-client plan resolutions did not create coherent activity events'
);
select pg_temp.assert_true(
  not exists (
    select 1
    from public.journal_entries as entry
    where entry.media_item_id in (
      'aaaaaaaa-aaaa-4aaa-8aaa-000000000011',
      'aaaaaaaa-aaaa-4aaa-8aaa-000000000012',
      'aaaaaaaa-aaaa-4aaa-8aaa-000000000013'
    )
      and (
        select count(*)
        from public.journal_events as event
        where event.journal_entry_id = entry.id
      ) <> 2
  ),
  'same-v1-client plan resolution lost or duplicated history'
);

-- A v1 status transition is a new activity even when there is no active
-- plan. Preserve every dated origin and create one new current mirror.
insert into public.journal_entries (
  user_id, media_item_id, status, started_on, completed_on
)
values
  ('11111111-1111-4111-8111-111111111111',
   'aaaaaaaa-aaaa-4aaa-8aaa-000000000017', 'completed', null, '2026-07-15'),
  ('11111111-1111-4111-8111-111111111111',
   'aaaaaaaa-aaaa-4aaa-8aaa-000000000018', 'completed', null, '2026-07-15'),
  ('11111111-1111-4111-8111-111111111111',
   'aaaaaaaa-aaaa-4aaa-8aaa-000000000019', 'in_progress', '2026-07-15', null),
  ('11111111-1111-4111-8111-111111111111',
   'aaaaaaaa-aaaa-4aaa-8aaa-000000000020', 'dropped', '2026-07-15', null);

create temporary table expected_unplanned_v1_origins
on commit drop
as
select event.journal_entry_id, event.id, event.event_type, event.event_date
from public.journal_events as event
join public.journal_entries as entry on entry.id = event.journal_entry_id
where entry.media_item_id in (
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000017',
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000018',
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000019',
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000020'
);

update public.journal_entries
set
  status = case media_item_id
    when 'aaaaaaaa-aaaa-4aaa-8aaa-000000000017' then 'in_progress'
    when 'aaaaaaaa-aaaa-4aaa-8aaa-000000000018' then 'dropped'
    when 'aaaaaaaa-aaaa-4aaa-8aaa-000000000019' then 'completed'
    when 'aaaaaaaa-aaaa-4aaa-8aaa-000000000020' then 'in_progress'
  end,
  started_on = case
    when media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000019' then null
    else '2026-08-01'::date
  end,
  completed_on = case
    when media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000019'
      then '2026-08-01'::date
    else null
  end
where media_item_id in (
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000017',
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000018',
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000019',
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000020'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from expected_unplanned_v1_origins as expected
    left join public.journal_events as event
      on event.id = expected.id
      and event.journal_entry_id = expected.journal_entry_id
      and event.event_type = expected.event_type
      and event.event_date = expected.event_date
    where event.id is null or event.is_legacy_mirror
  ),
  'an unplanned v1 status transition changed or failed to freeze its origin'
);
select pg_temp.assert_true(
  not exists (
    select 1
    from public.journal_entries as entry
    join (
      values
        ('aaaaaaaa-aaaa-4aaa-8aaa-000000000017'::uuid, 'in_progress'::text, 'started'::text),
        ('aaaaaaaa-aaaa-4aaa-8aaa-000000000018'::uuid, 'dropped'::text, 'stopped'::text),
        ('aaaaaaaa-aaaa-4aaa-8aaa-000000000019'::uuid, 'completed'::text, 'completed'::text),
        ('aaaaaaaa-aaaa-4aaa-8aaa-000000000020'::uuid, 'in_progress'::text, 'started'::text)
    ) as expected(media_item_id, status, event_type)
      on expected.media_item_id = entry.media_item_id
    where entry.status <> expected.status
      or entry.effective_status <> expected.status
      or entry.has_active_plan
      or (select count(*) from public.journal_events as event
          where event.journal_entry_id = entry.id) <> 2
      or (select count(*) from public.journal_events as event
          where event.journal_entry_id = entry.id
            and event.is_legacy_mirror
            and event.event_type = expected.event_type
            and event.event_date = '2026-08-01') <> 1
  ),
  'an unplanned v1 transition did not create exactly one coherent activity'
);

create temporary table expected_same_status_edit
on commit drop
as
select event.id
from public.journal_events as event
join public.journal_entries as entry on entry.id = event.journal_entry_id
where entry.media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000017'
  and event.is_legacy_mirror;
update public.journal_entries
set status = 'in_progress', started_on = '2026-08-02'
where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000017';
select pg_temp.assert_true(
  (select count(*) = 2 from public.journal_events
   where journal_entry_id = (
     select id from public.journal_entries
     where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000017'
   ))
  and exists (
    select 1
    from public.journal_events as event
    join expected_same_status_edit as expected on expected.id = event.id
    where event.event_date = '2026-08-02'
      and event.is_legacy_mirror
  ),
  'a same-status v1 date edit created another activity instead of editing'
);

-- Undated origins also survive no-plan transitions without an invented date.
insert into public.journal_entries (user_id, media_item_id, status)
values
  ('11111111-1111-4111-8111-111111111111',
   'aaaaaaaa-aaaa-4aaa-8aaa-000000000021', 'completed'),
  ('11111111-1111-4111-8111-111111111111',
   'aaaaaaaa-aaaa-4aaa-8aaa-000000000022', 'completed');
update public.journal_entries
set
  status = case media_item_id
    when 'aaaaaaaa-aaaa-4aaa-8aaa-000000000021' then 'in_progress'
    when 'aaaaaaaa-aaaa-4aaa-8aaa-000000000022' then 'dropped'
  end,
  started_on = '2026-08-01'
where media_item_id in (
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000021',
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000022'
);
select pg_temp.assert_true(
  not exists (
    select 1
    from public.journal_entries as entry
    join (
      values
        ('aaaaaaaa-aaaa-4aaa-8aaa-000000000021'::uuid, 'in_progress'::text, 'started'::text),
        ('aaaaaaaa-aaaa-4aaa-8aaa-000000000022'::uuid, 'dropped'::text, 'stopped'::text)
    ) as expected(media_item_id, status, event_type)
      on expected.media_item_id = entry.media_item_id
    where entry.status <> expected.status
      or entry.effective_status <> expected.status
      or entry.undated_completed_count <> 1
      or (select count(*) from public.journal_events as event
          where event.journal_entry_id = entry.id
            and event.event_type = expected.event_type
            and event.event_date = '2026-08-01') <> 1
      or (select count(*) + entry.undated_completed_count
          from public.journal_events as event
          where event.journal_entry_id = entry.id) <> 2
  ),
  'an unplanned v1 transition discarded an undated completion identity'
);

-- Resolving a bridged plan adds activity without replacing an older undated
-- completion. The legacy projection and v1.1 effective state remain distinct
-- while the plan is active, then converge after resolution.
insert into public.journal_entries (user_id, media_item_id, status)
select
  '11111111-1111-4111-8111-111111111111',
  ('aaaaaaaa-aaaa-4aaa-8aaa-' || lpad(value::text, 12, '0'))::uuid,
  'completed'
from generate_series(14, 16) as value;

update public.journal_entries
set status = 'planned', started_on = '2026-09-20'
where media_item_id in (
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000014',
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000015',
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000016'
);
select pg_temp.assert_true(
  (select count(*) = 3
   from public.journal_entries
   where media_item_id in (
     'aaaaaaaa-aaaa-4aaa-8aaa-000000000014',
     'aaaaaaaa-aaaa-4aaa-8aaa-000000000015',
     'aaaaaaaa-aaaa-4aaa-8aaa-000000000016'
   )
     and status = 'planned'
     and effective_status = 'completed'
     and has_active_plan
     and planned_for = '2026-09-20'
     and undated_completed_count = 1),
  'legacy plan readback or v1.1 effective state was incoherent'
);

update public.journal_entries
set
  status = case media_item_id
    when 'aaaaaaaa-aaaa-4aaa-8aaa-000000000014' then 'completed'
    when 'aaaaaaaa-aaaa-4aaa-8aaa-000000000015' then 'in_progress'
    when 'aaaaaaaa-aaaa-4aaa-8aaa-000000000016' then 'dropped'
  end,
  started_on = case
    when media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000014' then null
    else '2026-09-20'::date
  end,
  completed_on = case
    when media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000014'
      then '2026-09-20'::date
    else null
  end
where media_item_id in (
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000014',
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000015',
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000016'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from public.journal_entries as entry
    join (
      values
        ('aaaaaaaa-aaaa-4aaa-8aaa-000000000014'::uuid, 'completed'::text, 2, 2),
        ('aaaaaaaa-aaaa-4aaa-8aaa-000000000015'::uuid, 'in_progress'::text, 2, 1),
        ('aaaaaaaa-aaaa-4aaa-8aaa-000000000016'::uuid, 'dropped'::text, 2, 1)
    ) as expected(media_item_id, status, activity_count, completed_count)
      on expected.media_item_id = entry.media_item_id
    where entry.status <> expected.status
      or entry.effective_status <> expected.status
      or entry.has_active_plan
      or entry.planned_for is not null
      or entry.undated_completed_count <> 1
      or (select count(*) + entry.undated_completed_count
          from public.journal_events as event
          where event.journal_entry_id = entry.id) <> expected.activity_count
      or (select count(*) + entry.undated_completed_count
          from public.journal_events as event
          where event.journal_entry_id = entry.id
            and event.event_type = 'completed') <> expected.completed_count
  ),
  'resolving an undated legacy plan lost identity or reported wrong counts'
);
select pg_temp.assert_true(
  (select count(*) = 3
   from public.journal_events as event
   join public.journal_entries as entry on entry.id = event.journal_entry_id
   where entry.media_item_id in (
     'aaaaaaaa-aaaa-4aaa-8aaa-000000000014',
     'aaaaaaaa-aaaa-4aaa-8aaa-000000000015',
     'aaaaaaaa-aaaa-4aaa-8aaa-000000000016'
   )
     and event.event_date = '2026-09-20'),
  'undated plan resolutions did not create exactly one dated event each'
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

-- Deleting the last event keeps a scheduled active plan visible to both
-- installed v1 clients and the v1.1 plan projection.
select public.journal_log_event(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000023', 'completed', '2026-07-29',
  null, null, false,
  '10000000-0000-4000-8000-000000000017', '2026-07-29'
);
select public.journal_save_plan(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000023', '2026-09-20', '2026-07-29'
);
select public.journal_delete_event(
  (select id from public.journal_events
   where operation_id = '10000000-0000-4000-8000-000000000017'),
  null
);
select pg_temp.assert_true(
  (select status = 'planned'
      and started_on = '2026-09-20'
      and effective_status = 'planned'
      and has_active_plan
      and planned_for = '2026-09-20'
   from public.journal_entries
   where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000023'),
  'deleting the last event changed a scheduled plan into Someday for v1'
);

-- Same-status v1 edits target the event currently projected by the legacy
-- row, even when an older event remains the designated legacy mirror.
insert into public.journal_entries (
  user_id, media_item_id, status, started_on, completed_on, rating, review_body
)
values
  ('11111111-1111-4111-8111-111111111111',
   'aaaaaaaa-aaaa-4aaa-8aaa-000000000024', 'completed', null, '2026-07-15', 3, 'Original completed'),
  ('11111111-1111-4111-8111-111111111111',
   'aaaaaaaa-aaaa-4aaa-8aaa-000000000025', 'completed', null, '2026-07-15', 3, 'Original date'),
  ('11111111-1111-4111-8111-111111111111',
   'aaaaaaaa-aaaa-4aaa-8aaa-000000000026', 'in_progress', '2026-07-15', null, null, 'Original started'),
  ('11111111-1111-4111-8111-111111111111',
   'aaaaaaaa-aaaa-4aaa-8aaa-000000000027', 'dropped', '2026-07-15', null, null, 'Original stopped'),
  ('11111111-1111-4111-8111-111111111111',
   'aaaaaaaa-aaaa-4aaa-8aaa-000000000028', 'completed', null, '2026-07-15', 3, 'Original planned-title watch');

create temporary table expected_mixed_writer_origins
on commit drop
as
select entry.media_item_id, event.id, event.event_type, event.event_date
from public.journal_events as event
join public.journal_entries as entry on entry.id = event.journal_entry_id
where entry.media_item_id between
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000024'
  and 'aaaaaaaa-aaaa-4aaa-8aaa-000000000028';

select public.journal_log_event(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000024', 'completed', '2026-07-29',
  4.5, 'v1.1 completed', false,
  '10000000-0000-4000-8000-000000000018', '2026-07-29'
);
select public.journal_log_event(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000025', 'completed', '2026-07-29',
  4, 'v1.1 date', false,
  '10000000-0000-4000-8000-000000000019', '2026-07-29'
);
select public.journal_log_event(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000026', 'started', '2026-07-29',
  null, 'v1.1 started', false,
  '10000000-0000-4000-8000-000000000020', '2026-07-29'
);
select public.journal_log_event(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000027', 'stopped', '2026-07-29',
  null, 'v1.1 stopped', false,
  '10000000-0000-4000-8000-000000000021', '2026-07-29'
);
select public.journal_log_event(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000028', 'completed', '2026-07-29',
  4.5, 'v1.1 planned-title rewatch', false,
  '10000000-0000-4000-8000-000000000022', '2026-07-29'
);
select public.journal_save_plan(
  'aaaaaaaa-aaaa-4aaa-8aaa-000000000028', '2026-09-20', '2026-07-29'
);

create temporary table expected_mixed_writer_targets
on commit drop
as
select entry.media_item_id, event.id
from public.journal_events as event
join public.journal_entries as entry on entry.id = event.journal_entry_id
where event.operation_id in (
  '10000000-0000-4000-8000-000000000018',
  '10000000-0000-4000-8000-000000000019',
  '10000000-0000-4000-8000-000000000020',
  '10000000-0000-4000-8000-000000000021',
  '10000000-0000-4000-8000-000000000022'
);

update public.journal_entries
set rating = 5, review_body = 'Edited completed from v1'
where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000024';
update public.journal_entries
set completed_on = '2026-07-20', review_body = 'Corrected date from v1'
where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000025';
update public.journal_entries
set review_body = 'Edited started from v1'
where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000026';
update public.journal_entries
set review_body = 'Edited stopped from v1'
where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000027';
update public.journal_entries
set
  status = 'completed',
  started_on = null,
  completed_on = '2026-07-29',
  rating = 5,
  review_body = 'Edited with plan from v1'
where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000028';

select pg_temp.assert_true(
  not exists (
    select 1
    from expected_mixed_writer_origins as expected
    left join public.journal_events as event
      on event.id = expected.id
      and event.event_type = expected.event_type
      and event.event_date = expected.event_date
    where event.id is null
  ),
  'a same-status v1 edit changed an unrelated older event ID or date'
);
select pg_temp.assert_true(
  not exists (
    select 1
    from public.journal_entries as entry
    where entry.media_item_id between
      'aaaaaaaa-aaaa-4aaa-8aaa-000000000024'
      and 'aaaaaaaa-aaaa-4aaa-8aaa-000000000028'
      and (select count(*) from public.journal_events as event
           where event.journal_entry_id = entry.id) <> 2
  ),
  'a same-status v1 edit lost or duplicated mixed-writer history'
);
select pg_temp.assert_true(
  not exists (
    select 1
    from public.journal_events as event
    join public.journal_entries as entry on entry.id = event.journal_entry_id
    where entry.media_item_id between
      'aaaaaaaa-aaaa-4aaa-8aaa-000000000024'
      and 'aaaaaaaa-aaaa-4aaa-8aaa-000000000028'
    group by event.journal_entry_id, event.event_type, event.event_date
    having count(*) > 1
  ),
  'a same-status v1 edit introduced duplicate event dates and types'
);
select pg_temp.assert_true(
  not exists (
    select 1
    from expected_mixed_writer_targets as expected
    join public.journal_entries as entry on entry.media_item_id = expected.media_item_id
    left join public.journal_events as event
      on event.id = expected.id and event.journal_entry_id = entry.id
    where event.id is null
      or (entry.media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000024'
        and (event.event_date <> '2026-07-29' or event.rating <> 5
          or event.notes <> 'Edited completed from v1'))
      or (entry.media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000025'
        and (event.event_date <> '2026-07-20'
          or event.notes <> 'Corrected date from v1'))
      or (entry.media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000026'
        and (event.event_type <> 'started'
          or event.notes <> 'Edited started from v1'))
      or (entry.media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000027'
        and (event.event_type <> 'stopped'
          or event.notes <> 'Edited stopped from v1'))
      or (entry.media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000028'
        and (event.event_date <> '2026-07-29' or event.rating <> 5
          or event.notes <> 'Edited with plan from v1'))
  ),
  'a same-status v1 edit did not update exactly the projected event'
);
select pg_temp.assert_true(
  (select status = 'planned'
      and started_on = '2026-09-20'
      and effective_status = 'completed'
      and has_active_plan
      and planned_for = '2026-09-20'
   from public.journal_entries
   where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000028'),
  'a projected metadata edit changed the independent active plan'
);
select pg_temp.assert_true(
  not exists (
    select 1
    from public.journal_entries as entry
    join (
      values
        ('aaaaaaaa-aaaa-4aaa-8aaa-000000000024'::uuid, 'completed'::text, '2026-07-29'::date),
        ('aaaaaaaa-aaaa-4aaa-8aaa-000000000025'::uuid, 'completed'::text, '2026-07-20'::date),
        ('aaaaaaaa-aaaa-4aaa-8aaa-000000000026'::uuid, 'in_progress'::text, '2026-07-29'::date),
        ('aaaaaaaa-aaaa-4aaa-8aaa-000000000027'::uuid, 'dropped'::text, '2026-07-29'::date)
    ) as expected(media_item_id, status, activity_date)
      on expected.media_item_id = entry.media_item_id
    where entry.status <> expected.status
      or entry.effective_status <> expected.status
      or case
        when expected.status = 'completed' then entry.completed_on
        else entry.started_on
      end <> expected.activity_date
  ),
  'a same-status v1 edit left incoherent current projections'
);

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

-- TAR-177: games remain in the same event table. A direct completion never
-- invents a start, an active play can be rated, and each event owns its own
-- optional private platform choice.
insert into public.media_items (
  id, source, source_id, media_type, title, genres, metadata
)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-000000000001', 'igdb', 'game:1', 'game',
  'Lifecycle game', '[]'::jsonb, '{}'::jsonb
);

set local role service_role;
set local request.jwt.claim.role = 'service_role';
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select public.journal_server_save_game_plan(
  '11111111-1111-4111-8111-111111111111',
  'bbbbbbbb-bbbb-4bbb-8bbb-000000000001', '2026-08-02', '2026-07-29'
);
select public.journal_server_log_game_event(
  '11111111-1111-4111-8111-111111111111',
  'bbbbbbbb-bbbb-4bbb-8bbb-000000000001', 'completed', '2026-07-20',
  4.5, 'Direct completion', true,
  '30000000-0000-4000-8000-000000000001', '2026-07-29', 'PC'
);
select public.journal_server_log_game_event(
  '11111111-1111-4111-8111-111111111111',
  'bbbbbbbb-bbbb-4bbb-8bbb-000000000001', 'started', '2026-07-29',
  4.0, 'Still playing', false,
  '30000000-0000-4000-8000-000000000002', '2026-07-29', 'PlayStation 5'
);
select pg_temp.assert_true(
  (select count(*) = 2 from public.journal_events where journal_entry_id = (
    select id from public.journal_entries where media_item_id = 'bbbbbbbb-bbbb-4bbb-8bbb-000000000001'
  )),
  'game direct completion or active play wrote an unexpected event count'
);
select pg_temp.assert_true(
  (select rating = 4.0 and played_on_platform = 'PlayStation 5'
   from public.journal_events where operation_id = '30000000-0000-4000-8000-000000000002'),
  'an in-progress game rating or event platform was not preserved'
);
select pg_temp.assert_true(
  (public.journal_server_log_game_event(
    '11111111-1111-4111-8111-111111111111',
    'bbbbbbbb-bbbb-4bbb-8bbb-000000000001', 'started', '2026-07-29',
    4.0, 'Still playing', false,
    '30000000-0000-4000-8000-000000000002', '2026-07-29', 'PlayStation 5'
  )->>'idempotent_replay')::boolean,
  'a rated active game play was not idempotent'
);
do $$
begin
  perform public.journal_server_log_game_event(
    '11111111-1111-4111-8111-111111111111',
    'bbbbbbbb-bbbb-4bbb-8bbb-000000000001', 'started', '2026-07-29',
    4.0, 'Still playing', false,
    '30000000-0000-4000-8000-000000000002', '2026-07-29', 'Different platform'
  );
  raise exception 'Expected conflicting game idempotency failure.';
exception
  when sqlstate '22023' then null;
end;
$$;
select pg_temp.assert_true(
  (select effective_status = 'in_progress' from public.journal_entries
   where media_item_id = 'bbbbbbbb-bbbb-4bbb-8bbb-000000000001'),
  'rating an active game changed its title state'
);
select pg_temp.assert_true(
  (select not has_active_plan from public.journal_entries
   where media_item_id = 'bbbbbbbb-bbbb-4bbb-8bbb-000000000001'),
  'a game completion did not resolve its active plan atomically'
);
select pg_temp.assert_true(
  (select rating = 4.0 from public.journal_entries
   where media_item_id = 'bbbbbbbb-bbbb-4bbb-8bbb-000000000001'),
  'active game rating was not projected onto the current Journal title'
);
select public.journal_server_update_game_event(
  '11111111-1111-4111-8111-111111111111',
  (select id from public.journal_events
   where operation_id = '30000000-0000-4000-8000-000000000002'),
  '2026-07-29', 4.5, 'Updated active play', '2026-07-29', 'Steam Deck'
);
select pg_temp.assert_true(
  (select rating = 4.5 and notes = 'Updated active play' and played_on_platform = 'Steam Deck'
   from public.journal_events where operation_id = '30000000-0000-4000-8000-000000000002'),
  'a game event update did not preserve its full private payload'
);
select public.journal_server_log_game_event(
  '11111111-1111-4111-8111-111111111111',
  'bbbbbbbb-bbbb-4bbb-8bbb-000000000001', 'stopped', '2026-07-30',
  null, 'Paused this run', false,
  '30000000-0000-4000-8000-000000000004', '2026-07-30', 'Steam Deck'
);
select pg_temp.assert_true(
  (select effective_status = 'dropped' and rating is null from public.journal_entries
   where media_item_id = 'bbbbbbbb-bbbb-4bbb-8bbb-000000000001'),
  'stopping an active game did not clear its active rating and state'
);
select public.journal_server_log_game_event(
  '11111111-1111-4111-8111-111111111111',
  'bbbbbbbb-bbbb-4bbb-8bbb-000000000001', 'started', '2026-07-31',
  3.5, 'Resumed', false,
  '30000000-0000-4000-8000-000000000005', '2026-07-31', 'Switch'
);
select pg_temp.assert_true(
  (select effective_status = 'in_progress' and rating = 3.5 from public.journal_entries
   where media_item_id = 'bbbbbbbb-bbbb-4bbb-8bbb-000000000001'),
  'resuming a stopped game did not restore the active play state'
);
select public.journal_server_log_game_event(
  '11111111-1111-4111-8111-111111111111',
  'bbbbbbbb-bbbb-4bbb-8bbb-000000000001', 'completed', '2026-07-29',
  5.0, null, false,
  '30000000-0000-4000-8000-000000000003', '2026-07-29', null
);
select pg_temp.assert_true(
  (select count(*) = 5 from public.journal_events where journal_entry_id = (
    select id from public.journal_entries where media_item_id = 'bbbbbbbb-bbbb-4bbb-8bbb-000000000001'
  )),
  'another play did not preserve earlier game history'
);
select pg_temp.assert_true(
  not has_function_privilege('authenticated', 'public.journal_log_game_event(uuid,text,date,numeric,text,boolean,uuid,date,text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.journal_update_game_event(uuid,date,numeric,text,date,text)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.journal_server_log_game_event(uuid,uuid,text,date,numeric,text,boolean,uuid,date,text)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.journal_server_update_game_event(uuid,uuid,date,numeric,text,date,text)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.journal_server_delete_game_event(uuid,uuid,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.journal_log_game_event(uuid,text,date,numeric,text,boolean,uuid,date,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.journal_update_game_event(uuid,date,numeric,text,date,text)', 'EXECUTE'),
  'game lifecycle RPC grants are not owner-safe'
);

-- The media-aware rule belongs in the database too: a raw client write may
-- rate an active game, but it must not create that exception for a movie.
reset role;
do $$
begin
  insert into public.journal_events (
    journal_entry_id, user_id, event_type, event_date, rating
  )
  values (
    (select id from public.journal_entries
     where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000002'),
    '11111111-1111-4111-8111-111111111111', 'started', '2026-07-29', 4.0
  );
  raise exception 'Expected non-game active rating failure.';
exception
  when sqlstate '22023' then null;
end;
$$;

-- Generic user RPCs cannot bypass the Edge-owned Games capability gate.
set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
do $$
begin
  perform public.journal_update_event(
    (select id from public.journal_events
     where operation_id = '30000000-0000-4000-8000-000000000005'),
    '2026-07-31', null, 'Bypass attempt', '2026-07-31'
  );
  raise exception 'Expected generic game update denial.';
exception
  when sqlstate '42501' then null;
end;
$$;
reset role;

-- Platform data cannot be smuggled onto a non-game through direct table writes.
do $$
begin
  insert into public.journal_events (
    journal_entry_id, user_id, event_type, event_date, played_on_platform
  ) values (
    (select id from public.journal_entries
     where media_item_id = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000002'),
    '11111111-1111-4111-8111-111111111111', 'started', '2026-10-01', 'PC'
  );
  raise exception 'Expected non-game platform failure.';
exception
  when sqlstate '22023' then null;
end;
$$;

-- Plan removal remains the narrow privacy-control exception while Games is
-- disabled. It must not double as a way to rewrite a game Journal title.
set local role service_role;
set local request.jwt.claim.role = 'service_role';
select public.journal_server_save_game_plan(
  '11111111-1111-4111-8111-111111111111',
  'bbbbbbbb-bbbb-4bbb-8bbb-000000000001', '2026-08-03', '2026-07-31'
);
set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
do $$
begin
  update public.journal_entries
  set has_active_plan = false, planned_for = null, rating = 1.0
  where media_item_id = 'bbbbbbbb-bbbb-4bbb-8bbb-000000000001';
  raise exception 'Expected bundled game plan-removal denial.';
exception
  when sqlstate '42501' then null;
end;
$$;
select public.journal_remove_plan(
  (select id from public.journal_entries
   where media_item_id = 'bbbbbbbb-bbbb-4bbb-8bbb-000000000001')
);
select pg_temp.assert_true(
  (select not has_active_plan and rating = 3.5
   from public.journal_entries
   where media_item_id = 'bbbbbbbb-bbbb-4bbb-8bbb-000000000001'),
  'the canonical game plan removal did not remain the narrow privacy exception'
);

-- Game deletion is an authenticated privacy-control path, but its projection
-- update runs through the service wrapper so a direct entry rewrite remains
-- impossible. Exercise one-event, final keep, final remove, and ownership.
reset role;
insert into public.media_items (
  id, source, source_id, media_type, title, genres, metadata
) values (
  'bbbbbbbb-bbbb-4bbb-8bbb-000000000002', 'igdb', 'game:2', 'game',
  'Deletion lifecycle game', '[]'::jsonb, '{}'::jsonb
);
set local role service_role;
set local request.jwt.claim.role = 'service_role';
select public.journal_server_log_game_event(
  '11111111-1111-4111-8111-111111111111',
  'bbbbbbbb-bbbb-4bbb-8bbb-000000000002', 'completed', '2026-07-20',
  4.0, 'First play', false,
  '30000000-0000-4000-8000-000000000006', '2026-07-31', 'PC'
);
select public.journal_server_log_game_event(
  '11111111-1111-4111-8111-111111111111',
  'bbbbbbbb-bbbb-4bbb-8bbb-000000000002', 'started', '2026-07-21',
  4.5, 'Second play', false,
  '30000000-0000-4000-8000-000000000007', '2026-07-31', 'PC'
);
select public.journal_server_delete_game_event(
  '11111111-1111-4111-8111-111111111111',
  (select id from public.journal_events
   where operation_id = '30000000-0000-4000-8000-000000000007'),
  null
);
select pg_temp.assert_true(
  (select effective_status = 'completed' and rating = 4.0
   from public.journal_entries
   where media_item_id = 'bbbbbbbb-bbbb-4bbb-8bbb-000000000002'),
  'deleting one game event did not refresh its current title projection'
);
do $$
begin
  perform public.journal_server_delete_game_event(
    '22222222-2222-4222-8222-222222222222',
    (select id from public.journal_events
     where operation_id = '30000000-0000-4000-8000-000000000006'),
    'remove'
  );
  raise exception 'Expected cross-user game deletion failure.';
exception
  when no_data_found then null;
end;
$$;
select public.journal_server_delete_game_event(
  '11111111-1111-4111-8111-111111111111',
  (select id from public.journal_events
   where operation_id = '30000000-0000-4000-8000-000000000006'),
  'keep_someday'
);
select pg_temp.assert_true(
  (select has_active_plan and planned_for is null and status = 'planned'
   from public.journal_entries
   where media_item_id = 'bbbbbbbb-bbbb-4bbb-8bbb-000000000002'),
  'deleting the final game event did not preserve the title in Someday'
);
select public.journal_server_log_game_event(
  '11111111-1111-4111-8111-111111111111',
  'bbbbbbbb-bbbb-4bbb-8bbb-000000000002', 'completed', '2026-07-22',
  5.0, 'Final play', true,
  '30000000-0000-4000-8000-000000000008', '2026-07-31', 'Switch'
);
select public.journal_server_delete_game_event(
  '11111111-1111-4111-8111-111111111111',
  (select id from public.journal_events
   where operation_id = '30000000-0000-4000-8000-000000000008'),
  'remove'
);
select pg_temp.assert_true(
  not exists (
    select 1 from public.journal_entries
    where media_item_id = 'bbbbbbbb-bbbb-4bbb-8bbb-000000000002'
  ),
  'deleting the final game event with remove did not remove the title'
);
set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
do $$
begin
  update public.journal_entries
  set rating = 1.0
  where media_item_id = 'bbbbbbbb-bbbb-4bbb-8bbb-000000000001';
  raise exception 'Expected direct game title update denial.';
exception
  when sqlstate '42501' then null;
end;
$$;

rollback;

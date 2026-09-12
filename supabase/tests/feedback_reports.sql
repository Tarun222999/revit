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
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  (
    '33333333-3333-4333-8333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'feedback-one@example.test', '', now(), now()
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'feedback-two@example.test', '', now(), now()
  );

insert into public.profiles (id, username, display_name)
values
  ('33333333-3333-4333-8333-333333333333', 'feedback_one', 'Feedback One'),
  ('44444444-4444-4444-8444-444444444444', 'feedback_two', 'Feedback Two');

select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'public.feedback_reports', 'insert')
    and not has_table_privilege('authenticated', 'public.feedback_reports', 'update')
    and not has_table_privilege('authenticated', 'public.feedback_reports', 'delete')
    and not has_table_privilege('anon', 'public.feedback_reports', 'select')
    and not has_table_privilege('anon', 'public.feedback_reports', 'insert'),
  'feedback table privileges are broader or narrower than intended'
);

select pg_temp.assert_true(
  has_column_privilege('authenticated', 'public.feedback_reports', 'id', 'select')
    and has_column_privilege('authenticated', 'public.feedback_reports', 'user_id', 'insert')
    and has_column_privilege('authenticated', 'public.feedback_reports', 'category', 'insert')
    and has_column_privilege('authenticated', 'public.feedback_reports', 'message', 'insert')
    and not has_column_privilege('authenticated', 'public.feedback_reports', 'message', 'select')
    and not has_column_privilege('authenticated', 'public.feedback_reports', 'status', 'insert'),
  'feedback receipt or protected columns have incorrect privileges'
);

set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';

insert into public.feedback_reports (
  user_id, category, message, source_screen, error_code, app_version, build_number,
  platform, os_version, contact_allowed
)
values (
  '33333333-3333-4333-8333-333333333333', 'bug', 'Planner could not remove a plan.',
  'journal_planner', 'remove_plan_failed', '1.3.0', '142', 'android', '16', true
);

select pg_temp.assert_true(
  (select count(id) = 1 from public.feedback_reports),
  'owner could not receive the inserted report receipt'
);

do $$
begin
  insert into public.feedback_reports (user_id, category, message)
  values ('44444444-4444-4444-8444-444444444444', 'bug', 'Cross-user insert');
  raise exception 'Expected cross-user insert denial.';
exception
  when insufficient_privilege then null;
end;
$$;

do $$
begin
  insert into public.feedback_reports (user_id, category, message)
  values ('33333333-3333-4333-8333-333333333333', 'unknown', 'Invalid category');
  raise exception 'Expected invalid category failure.';
exception
  when check_violation then null;
end;
$$;

do $$
begin
  insert into public.feedback_reports (user_id, category, message)
  values (
    '33333333-3333-4333-8333-333333333333',
    'other',
    repeat('x', 1201)
  );
  raise exception 'Expected over-limit message failure.';
exception
  when check_violation then null;
end;
$$;

set local request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';
select pg_temp.assert_true(
  (select count(id) = 0 from public.feedback_reports),
  'another user could read a feedback receipt'
);

reset role;

select pg_temp.assert_true(
  (select count(*) = 1 from public.feedback_reports),
  'denied operations changed stored feedback'
);

rollback;

begin;
create or replace function pg_temp.assert_true(value boolean, message text)
returns void language plpgsql as $$ begin
  if value is not true then raise exception 'Assertion failed: %', message; end if;
end $$;

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values ('55555555-5555-4555-8555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'share-owner@example.test', '', now(), now()),
('66666666-6666-4666-8666-666666666666', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'share-reader@example.test', '', now(), now());
insert into public.profiles(id, username, display_name) values
('55555555-5555-4555-8555-555555555555', 'share_owner', 'Owner'),
('66666666-6666-4666-8666-666666666666', 'share_reader', 'Reader');
insert into public.lists(id, user_id, name, description, is_default) values
('77777777-7777-4777-8777-777777777777', '55555555-5555-4555-8555-555555555555', 'Shared favorites', 'Public description', true);

select pg_temp.assert_true(not has_table_privilege('anon', 'public.list_shares', 'select')
  and not has_table_privilege('authenticated', 'public.list_shares', 'select')
  and not has_function_privilege('authenticated', 'public.manage_list_sharing(uuid,uuid,text,integer,text)', 'execute')
  and not has_function_privilege('anon', 'public.resolve_shared_list(text,uuid,integer,boolean)', 'execute'), 'clients have no direct grant or RPC access');
select pg_temp.assert_true((select relrowsecurity from pg_class where oid = 'public.list_shares'::regclass), 'grant RLS enabled');

do $$ declare
  owner_id uuid := '55555555-5555-4555-8555-555555555555';
  reader_id uuid := '66666666-6666-4666-8666-666666666666';
  list_id uuid := '77777777-7777-4777-8777-777777777777';
  result jsonb;
begin
  result := public.manage_list_sharing(list_id, reader_id, 'share', 0, repeat('a',64));
  perform pg_temp.assert_true(result->>'code' = 'list_unavailable', 'cross-user share denied');
  result := public.manage_list_sharing(list_id, owner_id, 'share', 0, repeat('a',64));
  perform pg_temp.assert_true(result->>'shareKey' = repeat('a',64) and result->>'version' = '1', 'first grant');
  result := public.manage_list_sharing(list_id, owner_id, 'share', 0, repeat('b',64));
  perform pg_temp.assert_true(result->>'shareKey' = repeat('a',64), 'concurrent first share reuses key');
  result := public.resolve_shared_list(repeat('a',64));
  perform pg_temp.assert_true(result->>'itemCount' = '0' and result->'items' = '[]'::jsonb, 'empty default list shareable');
  perform pg_temp.assert_true(result->>'isOwner' = 'false' and not result ? 'listId' and not result ? 'user_id', 'anonymous identity exclusion');
  result := public.resolve_shared_list(repeat('a',64), owner_id);
  perform pg_temp.assert_true(result->>'isOwner' = 'true' and result->>'listId' = list_id::text, 'verified owner redirect');
  result := public.manage_list_sharing(list_id, reader_id, 'stop', 1);
  perform pg_temp.assert_true(result->>'code' = 'list_unavailable', 'cross-user stop denied');
  result := public.manage_list_sharing(list_id, owner_id, 'stop', 1);
  perform pg_temp.assert_true(result->>'version' = '2' and result->'shareKey' = 'null'::jsonb, 'stop increments generation');
  perform pg_temp.assert_true(public.resolve_shared_list(repeat('a',64)) is null, 'revoked key denied');
  result := public.manage_list_sharing(list_id, owner_id, 'share', 0, repeat('c',64));
  perform pg_temp.assert_true(result->>'code' = 'sharing_conflict', 'delayed first share cannot recreate');
  result := public.manage_list_sharing(list_id, owner_id, 'stop', 1);
  perform pg_temp.assert_true(result->>'version' = '2', 'stop retry idempotent');
  result := public.manage_list_sharing(list_id, owner_id, 'share', 2, repeat('d',64));
  perform pg_temp.assert_true(result->>'shareKey' = repeat('d',64), 'fresh grant');
  result := public.manage_list_sharing(list_id, owner_id, 'stop', 1);
  perform pg_temp.assert_true(result->>'code' = 'sharing_conflict', 'stale stop cannot revoke new grant');
end $$;

insert into public.media_items(source, source_id, media_type, title, metadata)
select 'tmdb', 'movie:' || n, 'movie', 'Public movie ' || n, '{"privateNote":"must not leak"}'::jsonb
from generate_series(900001,900045) n;
insert into public.list_items(list_id, media_item_id, note)
select '77777777-7777-4777-8777-777777777777', id, 'Private list note' from public.media_items where source_id ~ '^movie:9000';
select pg_temp.assert_true(public.resolve_shared_list(repeat('d',64))->>'itemCount' = '45', 'count reflects visible items');
select pg_temp.assert_true(jsonb_array_length(public.resolve_shared_list(repeat('d',64))->'items') = 40, 'bounded first page');
select pg_temp.assert_true(jsonb_array_length(public.resolve_shared_list(repeat('d',64), null, 40)->'items') = 5, 'bounded second page');
select pg_temp.assert_true(jsonb_array_length(public.resolve_shared_list(repeat('d',64))->'coverItems') = 4, 'bounded cover');
select pg_temp.assert_true(public.resolve_shared_list(repeat('d',64))::text not like '%Private list note%'
  and public.resolve_shared_list(repeat('d',64))::text not like '%privateNote%', 'notes and metadata excluded');
insert into public.media_items(source, source_id, media_type, title, metadata) values
('igdb', '990001', 'game', 'Eligible game', '{"igdbCatalogPolicyVersion":"games-catalog-v1"}'),
('igdb', '990002', 'game', 'Unverified snapshot', '{}');
insert into public.list_items(list_id, media_item_id)
select '77777777-7777-4777-8777-777777777777', id from public.media_items where source = 'igdb' and source_id in ('990001','990002');
select pg_temp.assert_true(public.resolve_shared_list(repeat('d',64), null, 0, false)->>'itemCount' = '45', 'disabled games excluded from count');
select pg_temp.assert_true(public.resolve_shared_list(repeat('d',64), null, 0, true)->>'itemCount' = '46', 'only policy-eligible games counted');
update public.lists set name = 'Renamed' where id = '77777777-7777-4777-8777-777777777777';
select pg_temp.assert_true(public.resolve_shared_list(repeat('d',64))->>'name' = 'Renamed', 'live edits');
set local role authenticated;
set local request.jwt.claim.sub = '66666666-6666-4666-8666-666666666666';
select pg_temp.assert_true(not exists(select from public.lists where id = '77777777-7777-4777-8777-777777777777'), 'private list remains owner-only');
select pg_temp.assert_true(not exists(select from public.list_items where list_id = '77777777-7777-4777-8777-777777777777'), 'private items remain owner-only');
reset role;
delete from public.lists where id = '77777777-7777-4777-8777-777777777777';
select pg_temp.assert_true(public.resolve_shared_list(repeat('d',64)) is null, 'delete invalidates link');
select pg_temp.assert_true(not exists(select from public.list_shares where list_id = '77777777-7777-4777-8777-777777777777'), 'grant cascade');
insert into public.lists(id, user_id, name) values('77777777-7777-4777-8777-777777777777', '55555555-5555-4555-8555-555555555555', 'Account deletion');
select public.manage_list_sharing('77777777-7777-4777-8777-777777777777', '55555555-5555-4555-8555-555555555555', 'share', 0, repeat('e',64));
delete from auth.users where id = '55555555-5555-4555-8555-555555555555';
select pg_temp.assert_true(public.resolve_shared_list(repeat('e',64)) is null, 'account deletion cascades to grants');
rollback;

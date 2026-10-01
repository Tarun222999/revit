-- Grants are server-only. RLS and table/RPC privileges remain closed to clients.
create table public.list_shares (
  list_id uuid primary key references public.lists(id) on delete cascade,
  share_key text unique check (share_key ~ '^[a-f0-9]{64}$'),
  version integer not null default 0 check (version >= 0)
);
alter table public.list_shares enable row level security;
revoke all on public.list_shares from public, anon, authenticated;
grant all on public.list_shares to service_role;

-- Only the Edge Function calls this invoker RPC with a verified user ID.
-- Lock the parent even before the first grant exists to serialize all operations.
create function public.manage_list_sharing(
  p_list_id uuid, p_user_id uuid, p_action text,
  p_expected_version integer default null, p_new_key text default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_owner uuid;
  v_key text;
  v_version integer := 0;
begin
  select user_id into v_owner from public.lists where id = p_list_id for update;
  if v_owner is null or v_owner is distinct from p_user_id then
    return jsonb_build_object('code', 'list_unavailable');
  end if;
  select share_key, version into v_key, v_version from public.list_shares where list_id = p_list_id;
  v_version := coalesce(v_version, 0);
  if p_action = 'share' and v_key is not null then
    -- Concurrent first shares converge; a stale request cannot recreate a stopped grant.
    return jsonb_build_object('shareKey', v_key, 'version', v_version);
  elsif p_action = 'stop' and v_key is null then
    return jsonb_build_object('shareKey', null, 'version', v_version);
  elsif p_action in ('share', 'stop') then
    if p_expected_version is distinct from v_version then
      return jsonb_build_object('code', 'sharing_conflict');
    end if;
    if p_action = 'share' and (p_new_key is null or p_new_key !~ '^[a-f0-9]{64}$') then
      raise exception 'Invalid share key';
    end if;
    v_key := case when p_action = 'share' then p_new_key else null end;
    v_version := v_version + 1;
    insert into public.list_shares(list_id, share_key, version)
    values(p_list_id, v_key, v_version)
    on conflict(list_id) do update set share_key = excluded.share_key, version = excluded.version;
  elsif p_action <> 'state' or p_action is null then
    raise exception 'Invalid sharing action';
  end if;
  return jsonb_build_object('shareKey', v_key, 'version', v_version);
end $$;
revoke all on function public.manage_list_sharing(uuid, uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.manage_list_sharing(uuid, uuid, text, integer, text) to service_role;

-- Public resolution still runs only on the server. No private metadata/notes
-- are selected. Grant lock ensures revocation and lookup serialize per list.
create function public.resolve_shared_list(
  p_key text, p_viewer_id uuid default null, p_offset integer default 0,
  p_games_enabled boolean default false
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_list public.lists;
  v_list_id uuid;
  v_count integer;
  v_items jsonb;
  v_covers jsonb;
begin
  if p_key is null or p_key !~ '^[a-f0-9]{64}$' or p_offset < 0 or p_offset > 100000 then
    return null;
  end if;
  select list_id into v_list_id from public.list_shares where share_key = p_key for share;
  if v_list_id is null then return null; end if;
  select * into v_list from public.lists where id = v_list_id;
  if v_list.id is null then return null; end if;
  with eligible as (
    select li.id, li.position, li.created_at,
      jsonb_build_object('source', m.source, 'sourceId', m.source_id,
        'mediaType', m.media_type, 'title', m.title,
        'year', substring(m.release_date::text from 1 for 4), 'imageUrl', m.image_url) as item
    from public.list_items li join public.media_items m on m.id = li.media_item_id
    where li.list_id = v_list_id and (
      (m.source = 'tmdb' and ((m.media_type = 'movie' and m.source_id ~ '^movie:[1-9][0-9]*$')
        or (m.media_type in ('series', 'anime') and m.source_id ~ '^tv:[1-9][0-9]*$')))
      or (p_games_enabled and m.source = 'igdb' and m.media_type = 'game'
        and m.source_id ~ '^[1-9][0-9]*$'
        and m.metadata->>'igdbCatalogPolicyVersion' = 'games-catalog-v1')
    )
  ), ordered as (
    select item, row_number() over(order by position asc nulls last, created_at desc, id asc) as rn
    from eligible
  )
  select count(*)::integer,
    coalesce(jsonb_agg(item order by rn) filter(where rn > p_offset and rn <= p_offset + 40), '[]'::jsonb),
    coalesce(jsonb_agg(item order by rn) filter(where rn <= 4), '[]'::jsonb)
  into v_count, v_items, v_covers from ordered;
  return jsonb_build_object('name', v_list.name, 'description', v_list.description,
    'itemCount', v_count, 'coverItems', v_covers, 'items', v_items,
    'isOwner', coalesce(v_list.user_id = p_viewer_id, false),
    'nextOffset', case when p_offset + 40 < v_count then p_offset + 40 else null end)
    || case when v_list.user_id = p_viewer_id then jsonb_build_object('listId', v_list.id) else '{}'::jsonb end;
end $$;
revoke all on function public.resolve_shared_list(text, uuid, integer, boolean) from public, anon, authenticated;
grant execute on function public.resolve_shared_list(text, uuid, integer, boolean) to service_role;

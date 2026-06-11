-- Phase 6: user-owned mixed-media lists.
-- Lists let users organize normalized media items into private custom
-- collections without duplicating or deleting shared media metadata.

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint lists_user_name_key
    unique (user_id, name),

  constraint lists_name_length_check
    check (char_length(btrim(name)) between 1 and 80),

  constraint lists_description_length_check
    check (description is null or char_length(description) <= 280)
);

create table if not exists public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  media_item_id uuid not null references public.media_items(id),
  position integer,
  note text,
  created_at timestamptz not null default now(),

  constraint list_items_list_media_item_key
    unique (list_id, media_item_id),

  constraint list_items_position_check
    check (position is null or position >= 0),

  constraint list_items_note_length_check
    check (note is null or char_length(note) <= 500)
);

create index if not exists lists_user_created_at_idx
on public.lists (user_id, created_at desc);

create index if not exists list_items_list_position_idx
on public.list_items (list_id, position);

create index if not exists list_items_list_created_at_idx
on public.list_items (list_id, created_at);

drop trigger if exists set_lists_updated_at on public.lists;

create trigger set_lists_updated_at
before update on public.lists
for each row
execute function public.set_updated_at();

alter table public.lists enable row level security;
alter table public.list_items enable row level security;

drop policy if exists "Users can insert their own lists" on public.lists;
create policy "Users can insert their own lists"
on public.lists
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can read their own lists" on public.lists;
create policy "Users can read their own lists"
on public.lists
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can update their own lists" on public.lists;
create policy "Users can update their own lists"
on public.lists
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete their own lists" on public.lists;
create policy "Users can delete their own lists"
on public.lists
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert items into their own lists" on public.list_items;
create policy "Users can insert items into their own lists"
on public.list_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.lists
    where lists.id = list_items.list_id
      and lists.user_id = auth.uid()
  )
);

drop policy if exists "Users can read items from their own lists" on public.list_items;
create policy "Users can read items from their own lists"
on public.list_items
for select
to authenticated
using (
  exists (
    select 1
    from public.lists
    where lists.id = list_items.list_id
      and lists.user_id = auth.uid()
  )
);

drop policy if exists "Users can update items in their own lists" on public.list_items;
create policy "Users can update items in their own lists"
on public.list_items
for update
to authenticated
using (
  exists (
    select 1
    from public.lists
    where lists.id = list_items.list_id
      and lists.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.lists
    where lists.id = list_items.list_id
      and lists.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete items from their own lists" on public.list_items;
create policy "Users can delete items from their own lists"
on public.list_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.lists
    where lists.id = list_items.list_id
      and lists.user_id = auth.uid()
  )
);

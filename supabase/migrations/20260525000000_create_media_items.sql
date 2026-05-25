-- Phase 2: normalized external media metadata.
-- These rows provide stable app-owned references for TMDB titles and future IGDB games.

create table if not exists public.media_items (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_id text not null,
  media_type text not null,
  title text not null,
  original_title text,
  description text,
  release_date date,
  image_url text,
  backdrop_url text,
  genres jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint media_items_source_check
    check (source in ('tmdb', 'igdb')),

  constraint media_items_media_type_check
    check (media_type in ('movie', 'series', 'anime', 'game')),

  constraint media_items_source_id_length_check
    check (char_length(btrim(source_id)) between 1 and 120),

  constraint media_items_title_length_check
    check (char_length(btrim(title)) between 1 and 300),

  constraint media_items_genres_array_check
    check (jsonb_typeof(genres) = 'array'),

  constraint media_items_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),

  constraint media_items_source_source_id_key
    unique (source, source_id)
);

create index if not exists media_items_media_type_idx
on public.media_items (media_type);

create index if not exists media_items_title_idx
on public.media_items (title);

drop trigger if exists set_media_items_updated_at on public.media_items;

create trigger set_media_items_updated_at
before update on public.media_items
for each row
execute function public.set_updated_at();

alter table public.media_items enable row level security;

drop policy if exists "Authenticated users can read media items" on public.media_items;
create policy "Authenticated users can read media items"
on public.media_items
for select
to authenticated
using (true);

-- Phase 3: shared cache for non-personalized discovery rails.
-- Discovery rails are the same for all users, so Edge Functions can reuse
-- cached TMDB responses instead of calling TMDB on every app request.

create table if not exists public.media_discovery_cache (
  mode text not null,
  media_type text not null,
  page integer not null,
  response jsonb not null,
  cached_at timestamptz not null default now(),
  expires_at timestamptz not null,

  constraint media_discovery_cache_pkey
    primary key (mode, media_type, page),

  constraint media_discovery_cache_mode_check
    check (mode in ('trending', 'new_releases', 'top_rated')),

  constraint media_discovery_cache_media_type_check
    check (media_type in ('movie', 'series', 'anime')),

  constraint media_discovery_cache_page_check
    check (page between 1 and 500),

  constraint media_discovery_cache_response_object_check
    check (jsonb_typeof(response) = 'object')
);

create index if not exists media_discovery_cache_expires_at_idx
on public.media_discovery_cache (expires_at);

alter table public.media_discovery_cache enable row level security;

-- TAR-168: the shared discovery cache remains keyed by mode + media type + page.
-- Games use the same cache table, with their public catalog policy version
-- validated by the Edge Function before a cached response is returned.

alter table public.media_discovery_cache
  drop constraint if exists media_discovery_cache_media_type_check;

alter table public.media_discovery_cache
  add constraint media_discovery_cache_media_type_check
  check (media_type in ('movie', 'series', 'anime', 'game'));

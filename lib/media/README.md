# Media Infrastructure

Shared media normalization and provider glue belongs here.

This folder should own the app's normalized media shape and provider-specific mapping helpers.

Production clients should not call TMDB or future IGDB APIs directly. External content API access belongs behind Supabase Edge Functions.

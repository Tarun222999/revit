# TAR-173 — Games Compliance: In-App Legal And Support

**Status:** Approved implementation — in-app copy complete; hosted and store-release actions pending

**Updated:** 24 August 2026

## Scope

TAR-173 updates the existing in-app Privacy Policy, Terms of Use, Credits /
Attributions, and Support screens for Games. It does not change Profile
navigation, configure Twitch or IGDB credentials, deploy hosted policies, or
submit store disclosures.

The existing Profile > Legal And Support section and public auth-route access
remain the entry points. Legal screens do not depend on the Games capability,
so they remain available when the server-authoritative Games flag is either on
or off.

## Branch dependency

TAR-173 depends on TAR-177 for the Games Journal data model. Before opening
the TAR-173 PR, rebase or stack this branch on the final TAR-177 branch. The
in-app policy only describes played-on platform choice and playthrough data
when a person uses Games Journal features; it does not claim those records
exist while Games Journal is unavailable.

## Implemented disclosures

### Privacy

- Games catalog search terms and public catalog requests travel through Revit's
  server-side Supabase Edge Functions and may be sent to IGDB to obtain catalog
  results.
- Revit does not intentionally send email address, profile identity, private
  Journal/history, platform choice, ratings, notes, reviews, or lists to IGDB.
- When a person uses Games Journal features, Revit owns private Game activity:
  playthrough events, platform choice, status, ratings, notes, reviews, and
  history. These records are stored with the existing Revit-owned Journal and
  list data, not in IGDB.
- Current code does not log raw search terms in the Games search handler. The
  catalog-policy decision only permits aggregate policy counts and query
  length; it explicitly excludes raw queries, private data, full payloads,
  credentials, and tokens.
- Account deletion removes live user data by deleting the Supabase Auth user;
  the existing profile, Journal, event, list, and list-item ownership
  relationships cascade from that user. Before that deletion, the current
  function lists up to 100 account-avatar objects and requests removal of the
  returned paths. This is not a guarantee that every storage-object version or
  backup copy is immediately deleted. The mobile app does not define a backup
  retention duration; hosted-release evidence must confirm the applicable
  provider retention process.

### Terms

- Revit's product description now includes Games.
- Public metadata is identified as TMDB-backed for movies, series, and anime,
  and IGDB (operated by Twitch) for games.
- Game ratings, release dates, platforms, imagery, links, and availability are
  expressly non-guaranteed provider metadata. Platform and storefront metadata
  does not assert ownership, installation, subscription access, or local
  availability.

### Credits and support

- The static Credits / Attributions screen has a permanent user-visible IGDB
  credit and an external `https://www.igdb.com/` link.
- Metadata corrections are routed to TMDB for movies/series/anime and IGDB for
  games. Support continues to warn users not to submit passwords, one-time
  codes, OAuth tokens, or private API keys.

## Release actions still required

These require hosted-environment or store-console access and are intentionally
outside this implementation worktree:

1. Publish matching Privacy Policy and Terms content at the released hosted
   URLs.
2. Confirm the actual Supabase project backup-retention configuration and
   record its duration in release evidence; revise public copy if a more
   specific retention statement is approved.
3. Re-audit Apple App Privacy and Google Play Data Safety declarations against
   the live Edge Function logging, provider requests, retention, and links.
4. Confirm commercial-use terms/partnership status with IGDB/Twitch before a
   monetized or other commercial release, as owned by TAR-181.
5. Re-verify IGDB attribution wording against the then-current agreement
   immediately before release.

## Authoritative provider references

- [IGDB API documentation](https://api-docs.igdb.com/): API use is under the
  Twitch Developer Services Agreement; the current FAQ asks commercial API
  integrations for visible attribution in a static user-facing location and
  identifies IGDB.com as the attribution destination.
- [IGDB contact and commercial partnership page](https://www.igdb.com/contact):
  current contact path for API/commercial partnership questions.
- [Twitch Developer Services Agreement](https://www.twitch.tv/p/en/legal/developer-agreement/):
  governing developer-service agreement linked by IGDB.

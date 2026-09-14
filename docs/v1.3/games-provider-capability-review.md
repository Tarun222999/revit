# Games Provider Capability Review

**Status:** Product exploration  
**Implementation:** Not approved  
**Reviewed:** 18 August 2026  
**Provider under review:** IGDB, authenticated through Twitch

## Purpose

This review tests whether games can join Revit's existing Discover, Details, Lists, and Journal experiences without pretending that game data behaves exactly like TMDB data.

It does not add games to the approved implementation scope. The accompanying HTML files are product concepts only.

## Recommendation

IGDB is a viable catalog provider for a journal-first games experience. It supports the public title context needed by Discover and Details, but it does not supply the player's private activity. Revit must own playthrough events, plans, platform choice, notes, ratings, and reviews in its database.

The safest product model is:

- one shared entertainment catalog and Journal structure
- media-aware labels and actions
- playthrough events rather than raw play sessions
- supported-platform data from IGDB, but played-on platform as user data
- no promises about ownership, installation, achievements, saves, or live hours

## Provider and Infrastructure Constraints

### Authentication

IGDB uses Twitch application authentication. Production access requires a Twitch account with two-factor authentication, a registered confidential application, a client ID, a client secret, and an OAuth application access token created with the client-credentials flow.

The client secret and access token must not ship in the Expo app. IGDB does not support browser CORS for direct client calls. Requests should pass through the existing Supabase Edge Function boundary, where credentials can remain server-side.

Application access tokens expire and must be refreshed. Token acquisition should not happen once per catalog request.

### Capacity and pagination

- rate limit: 4 requests per second
- concurrency limit: 8 in-flight requests
- default response size: 10 records
- maximum response size: 500 records per request
- pagination: `limit` and `offset`

Discover should therefore use cached, purpose-built server responses rather than composing many client-side endpoint calls per shelf.

### Licensing

IGDB describes its API as free for non-commercial use and directs commercial use inquiries to its partnership channel. App Store or Play Store release plans should include an explicit licensing review before games are approved for production.

## What IGDB Can Supply

| Revit surface | Provider data | Product use |
| --- | --- | --- |
| Discover cover rows | cover, artworks, screenshots | Game cover cards and editorial feature art |
| Trending | PopScore popularity primitives | A Revit-defined trending ranking; there is no single universal trending field |
| New releases | first release date and release-date records | New game shelf, with platform and region handling where needed |
| Top rated | rating, aggregated rating, total rating, vote counts | Provider score with a clear label, separate from the user's Journal rating |
| Search | text search with similarity ordering | Title discovery; editions can be filtered using version relationships |
| Details summary | summary, storyline | The world/story section |
| Classification | genres, themes, player perspectives, game modes | Chips and context labels |
| Credits | involved companies and developer/publisher/support roles | Developer and publisher details |
| Compatibility | platforms | Platforms the game supports, not the platform the user owns or used |
| Release context | platform- and region-specific release dates | Expandable release list; first release date can remain the compact summary |
| Video | game videos with YouTube identifiers | Trailer action when a video exists |
| Duration | time-to-beat estimates | Informational estimate, not tracked playtime |
| Suitability | age ratings | Organization- and region-aware age-rating display |
| Related products | editions, versions, DLC, expansions, remakes, remasters | Related-title modeling if later approved |
| External links | official and storefront website categories | Optional outbound links; not proof of ownership or availability for this user |

IGDB is migrating several older enum fields to table-backed types. New integration work should use the current fields and avoid deprecated category, collection, follows, status, region, and release-date category behavior.

## Mapping the Current Flows

### Discover

| Current mode or element | Games treatment | Feasibility |
| --- | --- | --- |
| Trending | Revit-defined score based on IGDB PopScore primitives | Supported with an explicit ranking decision |
| New releases | Release dates, optionally scoped by platform/region | Supported |
| Top rated | IGDB rating or aggregate, with vote-count safeguards | Supported |
| Feature artwork | Artwork or screenshot | Supported, with cover fallback |
| Open details | Route using normalized media type and external ID | Supported after an approved implementation plan |
| Add to Journal | Replace generic first action with Start playing or Plan to play | Supported by Revit-owned data |

### Journal

The approved event model can conceptually carry games if labels are media-aware:

| Existing meaning | Movie/series label | Game label |
| --- | --- | --- |
| Start lifecycle | Started watching | Started playing |
| Complete lifecycle | Watched / Finished | Finished playing |
| Stop lifecycle | Stopped watching | Stopped playing |
| Repeat lifecycle | Rewatch | Another playthrough |
| Future intent | Plan to watch | Plan to play |

This is a product mapping, not schema approval. Game-specific platform choice would be new personal data and should be designed in a dedicated implementation phase.

### Details

The game screen should preserve the hierarchy of the current movie screen while changing its information model:

| Current movie section | Game replacement |
| --- | --- |
| Hero backdrop/poster | Artwork or screenshot plus cover fallback |
| TMDB/public score | Clearly labeled IGDB rating or aggregate |
| Log watch | Start playing, then Finish playing |
| Watch history | Playthrough history |
| Story | Summary or storyline |
| Top cast | Developer, publisher, platforms, and ways to play |
| Runtime | Time-to-beat estimate |
| Release date | First release plus optional platform/region release list |
| Trailer | IGDB game video when available; hide or disable otherwise |

## What Cannot Be Implemented from IGDB Alone

### No film-style cast surface

IGDB provides involved companies and their roles, but not a dependable TMDB-like performer-credit relationship. The current **Top cast** section cannot be reproduced for games using IGDB alone.

### No ownership or installation truth

A platform or storefront link means the title is associated with that platform or site. It does not mean the user owns it, has it installed, receives it through a subscription, or can currently buy it in their locale.

### No player account progress

IGDB does not provide the user's:

- achievements
- save data
- completion percentage
- current quest or chapter
- live playtime
- last-played timestamp
- game-library membership

Those features require user input or separate authenticated platform integrations. They should not be implied by this provider plan.

### No personal played-on platform

IGDB supplies the set of supported platforms. The specific platform selected for a Journal event is personal data and must be recorded by Revit if the product chooses to support it.

### No single universal release date

Games often release on different dates by platform and region. `first_release_date` is useful for cards, but the detail screen should not present it as the only release truth.

### No guaranteed trailer

Video records can supply YouTube identifiers, but every title is not guaranteed to have a usable video. The trailer control needs an absent state.

### No canonical trending switch

IGDB exposes popularity primitives rather than one permanent, universal trending value. Revit must choose and document the ranking input, time window, fallbacks, and caching behavior.

## Product Decisions Still Required

Before implementation, approve a dedicated games phase that decides:

1. Whether `Finished playing` means the player saw an ending, considers the game complete, or simply closed a playthrough.
2. Whether endless, competitive, sandbox, and live-service games can be rated without a finished event.
3. Whether played-on platform belongs on each event, the playthrough as a whole, or neither.
4. Which IGDB rating is shown and how minimum vote counts affect Top rated.
5. Which PopScore primitives define Trending.
6. Which platform and region determine New releases and compact release labels.
7. How base games, editions, DLC, expansions, remakes, and remasters appear in search.
8. Whether outbound storefront links are in scope.
9. Whether IGDB's commercial terms fit the intended release.

## Integration Boundary if Approved

The existing architecture remains appropriate:

1. Expo calls a Revit catalog endpoint.
2. A Supabase Edge Function owns Twitch credentials and IGDB requests.
3. The function batches required fields, applies search/ranking rules, normalizes records, and returns the existing app-facing media shape plus game extensions.
4. TanStack Query caches the normalized result on the client.
5. Revit stores private plans and playthrough events in Supabase Postgres.

No IGDB credential or direct provider call should exist in the client.

## Concept Artifacts

- `docs/concepts/redesigned-discover-screen.html`
- `docs/concepts/redesigned-journal-flow.html`
- `docs/concepts/redesigned-game-details-screen.html`

## Official References

- [IGDB API documentation](https://api-docs.igdb.com/)
- [Twitch application access tokens](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/)


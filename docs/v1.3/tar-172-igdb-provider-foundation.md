# TAR-172 — IGDB Provider Foundation

**Status:** Approved implementation

## Boundary

All IGDB network access goes through `createIgdbClient()` in the shared Edge
Function layer. Discover, Search, and Details supply their own Apicalypse field,
filter, ordering, and pagination statements to `queryGames()`; they must not
create another Twitch token client, provider transport, limiter, or base game
normalizer.

`normalizeIgdbGame()` owns the compact identity shared by every surface:

- `source = igdb`
- `sourceId = String(igdbGame.id)`
- `mediaType = game`

The source/provider pair makes the route and database identity collision-safe
alongside TMDB movie and TV identifiers.

## Server configuration contract

The provider reads `IGDB_CLIENT_ID` and `IGDB_CLIENT_SECRET` only from the Edge
Function environment. `.env.example` contains placeholders for local fixture
development; real local `.env` files remain ignored. Missing, inaccessible, or
malformed values produce only `igdb_not_configured` and never include a value.

TAR-181 owns creating the Twitch application, configuring real hosted secrets,
ownership, rotation, revocation, and live verification. Credential presence
does not enable Games; TAR-180 remains the capability authority.

## Token and request coordination

The migration creates service-role-only RPCs over state in the unexposed
`private` schema:

- a fenced 15-second token refresh lease prevents distributed cold starts from
  stampeding Twitch and prevents an expired owner from overwriting a successor;
- the valid app token is reused across Edge instances and replaced shortly
  before expiry;
- a matching rejected token may be invalidated and replaced once after 401;
- a rolling one-second start ledger enforces at most three starts in any
  second, leaving headroom
  below IGDB's four-start rate, and no more than eight concurrent requests;
- 30-second request lease expiry recovers capacity after a terminated isolate;
- one controlled provider 429 retry honors `Retry-After` up to five seconds.

Only `service_role` may execute the coordination RPCs. `anon` and
`authenticated` have no schema/table/function access. Tokens never enter the
public Data API, app client, normalized media metadata, logs, or safe errors.

## Provider errors

Consumers receive stable safe codes:

- `games_feature_disabled`
- `igdb_not_configured`
- `igdb_authentication_failed`
- `igdb_rate_limited`
- `igdb_unavailable`
- `igdb_invalid_response`

The provider performs one authentication recovery and one controlled 429
retry. It does not broadly retry provider outages because client queries
already own their retry policy.

## Product-policy boundary

The normalizer preserves provider age-rating facts for TAR-182. It does not
decide mature/adult eligibility and does not infer ownership, played-on
platform, achievements, progress, or a universal release truth.

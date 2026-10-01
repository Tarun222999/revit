# TAR-180 — Games Feature Flag

**Status:** Approved implementation

## Contract

Games use one server-resolved environment capability: `GAMES_FEATURE_ENABLED`.
The value is enabled only when it is exactly `true`. Missing, empty, malformed,
or unavailable configuration resolves to disabled.

The public `app-capabilities` Edge Function exposes only:

```json
{ "gamesEnabled": false }
```

The client obtains this value through `AppCapabilitiesProvider`. While the
request is loading or has failed, Games remain disabled. Games surfaces must
consume this provider rather than reading an Expo environment variable.
Capability requests time out after 10 seconds. A continuously active client
refreshes at most every five minutes, so UI rollback has a five-minute maximum
polling delay; server guards apply the new value on the next request.

Game-capable Edge Functions must also call `requireGamesFeatureEnabled()`
before a provider request or game mutation. UI hiding is not authorization.

## Environment setup

No secret is required for a safe default: leave `GAMES_FEATURE_ENABLED` unset
or set it to `false` in local, preview, and production environments.

After the IGDB configuration and release-readiness tickets are complete, an
environment owner can enable the capability with:

```sh
supabase secrets set GAMES_FEATURE_ENABLED=true --project-ref <project-ref>
```

Disable it without publishing a client update with:

```sh
supabase secrets set GAMES_FEATURE_ENABLED=false --project-ref <project-ref>
```

Use the capability endpoint to verify the resolved value after either change.
Do not enable Games merely because IGDB credentials exist.

## Rollback behavior

Disabling the capability prevents new provider-dependent Games work. Surface
tickets must preserve already persisted Journal and List data and present it in
a read-only unavailable state. The flag must never delete or rewrite user data.

The release owner controls production changes. Provider credentials and live
IGDB verification remain owned by TAR-181.

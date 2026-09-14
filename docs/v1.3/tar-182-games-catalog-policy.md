# TAR-182 — Games catalog and mature-content policy

Status: Approved implementation contract

Policy version: `games-catalog-v1`

## Decision

Revit treats mature age classifications and sexually explicit catalog content as separate concepts. Mature and 18-rated games remain eligible. A rating alone never proves that a title is sexually explicit. Public Games surfaces exclude titles carrying IGDB's explicit Erotic theme (`themes` contains ID `42`).

This policy is enforced by `evaluateIgdbCatalogEligibility()` before normalization, persistence, cache writes, or public responses. Discover, Search, and direct Game Details must also use provider-side filters to reduce wasted IGDB capacity, but provider filtering never replaces the shared post-fetch gate.

## Initial catalog eligibility

Use IGDB's current table-backed fields. Do not build new queries around the deprecated `category`, `status`, or legacy age-rating enum fields.

Eligible `game_type.type` values:

- Main Game
- Remake
- Remaster

All other types are excluded for v1.3, including DLC/add-ons, expansions, standalone expansions, bundles, mods, episodes, seasons, expanded games, ports, forks, packs, and updates. Records with a non-null `version_parent` are excluded as edition variants.

Released, Alpha, Beta, Early Access, and Offline titles are eligible in Search and Details. Missing status is allowed because it is not evidence of exclusion. Cancelled, Rumored, and Delisted titles are excluded from new public catalog results. A numeric unexpanded `game_type` or `game_status` relation fails closed; catalog queries must expand the current relation fields.

Discover's New Releases rail additionally requires a release date no later than the current server date. Future titles may still appear in Search and direct Details.

## Ratings and regional conflicts

Unknown, missing, and unrated titles remain eligible and are represented as `unrated`; the UI must not describe them as family-safe. When ratings disagree across regions, Revit retains the provider records and does not invent a universal severity comparison. Presentation uses the deterministic organization order ESRB, PEGI, CERO, USK, GRAC, CLASS_IND, then ACB when no locale-specific selection is available.

Current provider integrations request `age_ratings.organization`, `age_ratings.rating_category`, and `age_ratings.rating_content_descriptions`. The shared normalizer temporarily accepts their deprecated counterparts during IGDB's migration window.

## Images, video, summaries, and links

- List cards use validated HTTPS IGDB cover images with a branded fallback.
- Details may use validated HTTPS artwork or screenshots with the cover fallback.
- The title-level Erotic theme exclusion applies before any associated summary, artwork, screenshot, or video is returned.
- IGDB does not expose a dependable per-image explicit-content flag. Do not attempt keyword moderation or claim that individual assets were safety-classified.
- A trailer action may be shown only for a syntactically valid IGDB YouTube video ID.
- External websites may be shown only when IGDB marks them trusted and the URL is HTTPS. Store links are informational and never imply ownership, installation, availability, or subscription access.

## Surface and private-data behavior

- Discover filtering occurs before ranking, pagination pools, cache writes, and featured-hero selection. If filtering empties a Games rail, use the existing quiet empty/fallback behavior; never substitute an excluded title.
- Games-only Search and Games appended to All use the same policy. Partial IGDB failure remains separate from policy exclusion.
- Direct Game Details resolution applies the same gate. An excluded title returns the neutral unavailable/not-found contract so a manually constructed route cannot bypass policy.
- A later policy or provider-status change never deletes an existing private Journal event, List membership, note, rating, or persisted title snapshot. Existing records remain readable in the feature flag's calm read-only state, while new provider refreshes and game mutations remain blocked when required.

## Cache invalidation

Every Games cache entry carries `policyVersion`. Cache reads reject a missing or mismatched value and regenerate the entry. Increment `IGDB_CATALOG_POLICY_VERSION` whenever any eligibility decision changes. Existing Discover TTLs remain owned by TAR-168; a policy mismatch invalidates immediately regardless of TTL.

## Safe observability

Record aggregate counts by policy version and reason (`erotic_theme`, `excluded_game_type`, `edition_variant`, `excluded_game_status`, and unknown relation shape), plus cache-version mismatches. Do not log raw searches, private Journal/List data, full IGDB payloads, credentials, or tokens. Query length may be logged; a query hash is unnecessary for initial release.

## Compliance handoff

TAR-173 must align store age-rating answers, hosted policy/support text, and IGDB attribution with the fact that mature/18-rated catalog metadata is visible. TAR-181 owns the real Twitch application and any required IGDB commercial-use approval. Neither is bypassed by this policy.

## Official provider references

- IGDB API reference and current Game, Game Type, Game Status, Age Rating, Website, Image, and Video fields: https://api-docs.igdb.com/
- IGDB enum-to-table migration notes: https://api-docs.igdb.com/#migration-enums-to-tables
- IGDB's documented Erotic-theme filter (`themes != (42)`): https://api-docs.igdb.com/#filtering

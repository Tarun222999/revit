# TAR-178 Games integration readiness

Status: Code integration complete; production release gate blocked

## Scope integrated

The `codex/tar-178-games-integration` branch aggregates the approved Games work behind the server-authoritative Games capability:

- TAR-180 Games feature flag
- TAR-172 IGDB provider and normalization foundation
- TAR-171 Search request hardening
- TAR-182 Games catalog policy
- TAR-170 Games Search
- TAR-168 Games Discover
- TAR-175 Game Details
- TAR-176 mixed-media Lists support
- TAR-174 journal-first sign-in redesign
- TAR-177 Games Journal lifecycle
- TAR-173 Games legal and privacy disclosures
- TAR-167 web-safe Discover and Journal pagers from the current `v1.3` baseline

Games remain disabled by default. Disabling the capability removes Games discovery and creation/mutation surfaces while preserving narrowly scoped privacy and removal actions for existing records.

## Verification evidence

- Full post-merge repository verification: 43 Jest suites and 354 tests, application TypeScript, Edge Function TypeScript, and lint passed.
- TAR-177 database verification: fresh local Supabase reset and Games lifecycle SQL tests passed.
- Expo dependency health: `expo-doctor` passed after supported Expo 54 patch updates.
- Security maintenance: the critical transitive advisory and other non-breaking fixes were applied. The production-dependency audit reports 0 critical, 9 high, and 10 moderate advisories remaining in the Expo/Metro toolchain; npm proposes a breaking Expo 57 upgrade, which is outside TAR-178.
- Final Expo web export passed and statically rendered all 29 routes with the web-safe pager implementation.

## Production release blockers

TAR-181 remains the production configuration gate. Before enabling Games in any production environment, complete all of the following:

1. Provision the production Twitch application and IGDB credentials only in Supabase secrets.
2. Validate token acquisition and refresh, 401 retry, 429/backoff behavior, provider outage handling, and agreed request concurrency against the live provider.
3. Run Android, iOS, and responsive-web journey QA with the production-shaped capability configuration. Physical-device and simulator journeys were not executed by this Windows automated pass.
4. Publish the updated hosted Privacy Policy and Terms, complete store disclosure updates, and confirm backup/deletion retention wording and operations.
5. Review the remaining Expo 54 toolchain advisories separately; do not use `npm audit fix --force` because it would perform an unplanned Expo major-version migration.

## Release and rollback

The integration PR must remain a draft until the blockers above are recorded as complete. Rollback does not require a client release: turn off the server-authoritative Games capability. Existing Games records remain private and retain their removal path; clients must not expose IGDB credentials or call IGDB directly.

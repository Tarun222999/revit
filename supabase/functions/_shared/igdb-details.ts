import { HttpError } from "./cors.ts";
import {
  evaluateIgdbCatalogEligibility,
  IGDB_CATALOG_POLICY_VERSION,
} from "./igdb-catalog-policy.ts";
import {
  normalizeIgdbGame,
  type IgdbNormalizedMediaItem,
} from "./igdb-normalizer.ts";
import type { IgdbGame } from "./igdb-types.ts";
import type { IgdbTimeToBeat } from "./igdb-types.ts";
import { IgdbProviderError } from "./provider-errors.ts";

type IgdbDetailsClient = {
  query: <T>(endpoint: "game_time_to_beats", query: string) => Promise<T[]>;
  queryGames: <T>(query: string) => Promise<T[]>;
};

export const IGDB_DETAILS_FIELDS = [
  "id",
  "name",
  "slug",
  "summary",
  "storyline",
  "first_release_date",
  "cover.image_id",
  "cover.url",
  "artworks.image_id",
  "artworks.url",
  "screenshots.image_id",
  "screenshots.url",
  "genres.name",
  "themes.id",
  "themes.name",
  "game_modes.name",
  "player_perspectives.name",
  "platforms.name",
  "platforms.abbreviation",
  "release_dates.date",
  "release_dates.platform.name",
  "release_dates.platform.abbreviation",
  "release_dates.release_region.region",
  "involved_companies.developer",
  "involved_companies.publisher",
  "involved_companies.company.name",
  "age_ratings.organization.name",
  "age_ratings.rating_category.rating",
  "age_ratings.synopsis",
  "age_ratings.rating_content_descriptions.description",
  "videos.name",
  "videos.video_id",
  "websites.trusted",
  "websites.type.type",
  "websites.url",
  "rating",
  "aggregated_rating",
  "total_rating",
  "total_rating_count",
  "rating_count",
  "aggregated_rating_count",
  "game_type.type",
  "game_status.status",
  "version_parent",
].join(",");

export function parseIgdbDetailsSourceId(sourceId: string) {
  if (
    !/^\d+$/.test(sourceId) ||
    !Number.isSafeInteger(Number(sourceId)) ||
    Number(sourceId) <= 0
  ) {
    throw new HttpError(400, "Invalid IGDB source id.");
  }

  return String(Number(sourceId));
}

export function createIgdbDetailsQuery(sourceId: string) {
  const id = parseIgdbDetailsSourceId(sourceId);
  return `fields ${IGDB_DETAILS_FIELDS}; where id = ${id} & version_parent = null & themes != (42) & game_type.type = ("main_game","remake","remaster") & (game_status = null | game_status.status = ("released","alpha","beta","early_access","offline")); limit 1;`;
}

export function createIgdbTimeToBeatQuery(sourceId: string) {
  const id = parseIgdbDetailsSourceId(sourceId);
  return `fields game_id,hastily,normally,completely,count; where game_id = ${id}; limit 1;`;
}

/**
 * Applies the same eligibility gate used by Discover and Search to every
 * details response. Policy exclusions intentionally look like missing titles
 * so a constructed route cannot disclose excluded catalog records.
 */
export function normalizeEligibleIgdbDetails(
  records: IgdbGame[],
  timeToBeatRecords: IgdbTimeToBeat[] = [],
): IgdbNormalizedMediaItem {
  const game = records[0];
  if (!game || !evaluateIgdbCatalogEligibility(game).eligible) {
    throw new HttpError(404, "Title not found.");
  }

  const timeToBeat = timeToBeatRecords.find(
    (record) => record.game_id === game.id,
  );
  const item = normalizeIgdbGame(game, { timeToBeat });
  if (!item) {
    throw new HttpError(404, "Title not found.");
  }

  item.metadata.igdbCatalogPolicyVersion = IGDB_CATALOG_POLICY_VERSION;
  return item;
}

export async function fetchNormalizedIgdbDetails(
  client: IgdbDetailsClient,
  sourceId: string,
) {
  const records = await client.queryGames<IgdbGame>(
    createIgdbDetailsQuery(sourceId),
  );
  // The policy gate must run before the optional second provider request.
  const eligibleItem = normalizeEligibleIgdbDetails(records);
  try {
    const timeToBeatRecords = await client.query<IgdbTimeToBeat>(
      "game_time_to_beats",
      createIgdbTimeToBeatQuery(eligibleItem.sourceId),
    );
    return normalizeEligibleIgdbDetails(records, timeToBeatRecords);
  } catch (error) {
    if (!(error instanceof IgdbProviderError)) {
      throw error;
    }
    // Time-to-beat is optional enrichment. Keep otherwise valid details usable
    // when that secondary IGDB endpoint is unavailable.
    return eligibleItem;
  }
}

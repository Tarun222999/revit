/**
 * The subset of the IGDB response contract used by Revit's catalog layer.
 *
 * These are provider types, not app-facing media types.  IGDB has migrated
 * several enum fields to table-backed records, so references accept both the
 * numeric form used by older responses and the expanded object form returned
 * when the relation is selected.
 */

export type IgdbId = number;

export type IgdbNamedReference = {
  id?: IgdbId | null;
  name?: string | null;
  slug?: string | null;
};

export type IgdbImageReference = {
  image_id?: string | null;
  url?: string | null;
  width?: number | null;
  height?: number | null;
};

export type IgdbPlatform = IgdbNamedReference & {
  abbreviation?: string | null;
};

export type IgdbAgeRatingCategory = {
  id?: IgdbId | null;
  organization?: number | IgdbNamedReference | null;
  rating?: string | null;
};

export type IgdbGameType = {
  id?: IgdbId | null;
  type?: string | null;
};

export type IgdbGameStatus = {
  id?: IgdbId | null;
  status?: string | null;
};

export type IgdbAgeRating = {
  id?: IgdbId | null;
  /** @deprecated IGDB is replacing this with `organization`. */
  category?: number | IgdbNamedReference | null;
  /** @deprecated IGDB is replacing this with `rating_category`. */
  rating?: number | IgdbNamedReference | null;
  organization?: number | IgdbNamedReference | null;
  rating_category?: number | IgdbAgeRatingCategory | null;
  synopsis?: string | null;
  /** @deprecated IGDB is replacing this with `rating_content_descriptions`. */
  content_descriptions?: Array<{
    id?: IgdbId | null;
    description?: string | null;
  }> | null;
  rating_content_descriptions?: Array<{
    id?: IgdbId | null;
    description?: string | null;
    description_type?: number | IgdbNamedReference | null;
    organization?: number | IgdbNamedReference | null;
  }> | null;
};

export type IgdbGame = {
  id: IgdbId;
  name?: string | null;
  slug?: string | null;
  summary?: string | null;
  storyline?: string | null;
  first_release_date?: number | string | null;
  cover?: IgdbImageReference | null;
  artworks?: IgdbImageReference[] | null;
  screenshots?: IgdbImageReference[] | null;
  genres?: IgdbNamedReference[] | null;
  platforms?: IgdbPlatform[] | null;
  age_ratings?: IgdbAgeRating[] | null;
  game_type?: number | IgdbGameType | null;
  game_status?: number | IgdbGameStatus | null;
  themes?: Array<number | IgdbNamedReference> | null;
  version_parent?: number | IgdbNamedReference | null;
  rating?: number | null;
  aggregated_rating?: number | null;
  total_rating?: number | null;
  rating_count?: number | null;
  aggregated_rating_count?: number | null;
  popularity?: number | null;
};

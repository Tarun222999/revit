import type { NormalizedMediaItem } from "@/types/media";

type ReleaseDate = {
  date?: string;
  platform?: string;
  region?: string;
};

type AgeRating = {
  organization?: { name?: string } | string;
  ratingCategory?: { rating?: string } | string;
};

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      )
    : [];
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString([], {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function namedValue(value: unknown, property: "name" | "rating") {
  if (typeof value === "string") return value;
  const item = record(value);
  return typeof item?.[property] === "string" ? item[property] : null;
}

function completionEstimate(seconds: number | null) {
  if (!seconds || seconds <= 0) return null;
  const hours = Math.round((seconds / 3600) * 2) / 2;
  return `About ${hours % 1 === 0 ? hours.toFixed(0) : hours} ${hours === 1 ? "hour" : "hours"}`;
}

export type GameDetailsModel = {
  ageRating: string | null;
  classifications: string[];
  developer: string | null;
  firstReleased: string | null;
  platforms: string[];
  publisher: string | null;
  releaseDates: ReleaseDate[];
  score: string | null;
  timeToBeat: { label: string; value: string }[];
  trailerKey: string | null;
  websites: { label: string; url: string }[];
};

export function isGame(item: NormalizedMediaItem) {
  return item.source === "igdb" && item.mediaType === "game";
}

export function getGameDetailsModel(
  item: NormalizedMediaItem,
): GameDetailsModel {
  const metadata = item.metadata;
  const releaseDates = Array.isArray(metadata.releaseDates)
    ? metadata.releaseDates.flatMap((value) => {
        const entry = record(value);
        if (!entry) return [];
        const date = typeof entry.date === "string" ? entry.date : undefined;
        const platform =
          typeof entry.platform === "string" ? entry.platform : undefined;
        const region =
          typeof entry.region === "string" ? entry.region : undefined;
        return date || platform ? [{ date, platform, region }] : [];
      })
    : [];
  const ageRating = Array.isArray(metadata.ageRatings)
    ? (metadata.ageRatings.flatMap((value) => {
        const rating = value as AgeRating;
        const organization = namedValue(rating.organization, "name");
        const category = namedValue(rating.ratingCategory, "rating");
        return organization && category
          ? [`${organization} · ${category}`]
          : [];
      })[0] ?? null)
    : null;
  const timeToBeat = record(metadata.timeToBeat);
  const video = record(metadata.youtubeVideo);
  const websites = Array.isArray(metadata.websites)
    ? metadata.websites.flatMap((value) => {
        const website = record(value);
        const rawUrl = typeof website?.url === 'string' ? website.url : null;
        if (!rawUrl) return [];
        try {
          const url = new URL(rawUrl);
          if (url.protocol !== 'https:') return [];
          const type = typeof website?.type === 'string' ? website.type : null;
          return [{
            label: type ? type.replace(/_/g, ' ') : 'Website',
            url: url.toString(),
          }];
        } catch {
          return [];
        }
      })
    : [];
  const totalRating = finiteNumber(metadata.totalRating);
  const ratingCount = finiteNumber(metadata.totalRatingCount);

  return {
    ageRating,
    classifications: [
      ...item.genres,
      ...strings(metadata.gameModes),
      ...strings(metadata.multiplayerModes),
      ...strings(metadata.playerPerspectives),
      ...strings(metadata.themes),
    ].filter((value, index, values) => values.indexOf(value) === index),
    developer: strings(metadata.developers).join(", ") || null,
    firstReleased: item.releaseDate ? formatDate(item.releaseDate) : null,
    platforms: strings(metadata.platforms),
    publisher: strings(metadata.publishers).join(", ") || null,
    releaseDates,
    score:
      totalRating && totalRating > 0
        ? `${Math.round(totalRating)} IGDB total${ratingCount && ratingCount > 0 ? ` · ${Math.round(ratingCount)} ratings` : ""}`
        : null,
    timeToBeat: [
      {
        label: "Quick play",
        value: completionEstimate(finiteNumber(timeToBeat?.hastilySeconds)),
      },
      {
        label: "Typical completion",
        value: completionEstimate(finiteNumber(timeToBeat?.normallySeconds)),
      },
      {
        label: "Completionist",
        value: completionEstimate(finiteNumber(timeToBeat?.completelySeconds)),
      },
    ].filter((estimate): estimate is { label: string; value: string } =>
      Boolean(estimate.value),
    ),
    trailerKey:
      typeof video?.id === "string" && /^[A-Za-z0-9_-]{6,64}$/.test(video.id)
        ? video.id
        : null,
    websites,
  };
}

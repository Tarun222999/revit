import { MEDIA_TYPE_LABELS } from '@/constants/media';
import type { NormalizedMediaItem } from '@/types/media';

export type TitleDetailMetric = {
  label: string;
  value: string;
};

function formatDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatRuntime(value: unknown) {
  if (typeof value !== 'number' || value <= 0) {
    return null;
  }

  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  if (hours <= 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

function firstString(values: unknown) {
  if (!Array.isArray(values)) {
    return null;
  }

  return values.find((value): value is string => typeof value === 'string') ?? null;
}

export function formatTitleMetadataLine(item: NormalizedMediaItem) {
  const parts = [
    MEDIA_TYPE_LABELS[item.mediaType],
    item.year,
    ...item.genres.slice(0, 2),
  ].filter(Boolean);

  return parts.join(' - ');
}

export function getTitleDetailMetrics(item: NormalizedMediaItem) {
  const metadata = item.metadata;
  const runtime = formatRuntime(metadata.runtime);
  const episodeRuntime = Array.isArray(metadata.episodeRuntime)
    ? formatRuntime(metadata.episodeRuntime[0])
    : null;
  const seasonCount =
    typeof metadata.seasonCount === 'number' && metadata.seasonCount > 0
      ? `${metadata.seasonCount}`
      : null;
  const network = firstString(metadata.networks);
  const studio = firstString(metadata.productionCompanies);
  const language =
    typeof metadata.originalLanguage === 'string'
      ? metadata.originalLanguage.toUpperCase()
      : null;

  return [
    { label: 'Released', value: formatDate(item.releaseDate) },
    { label: 'Runtime', value: runtime ?? episodeRuntime },
    { label: 'Seasons', value: seasonCount },
    { label: 'Network', value: network },
    { label: 'Studio', value: studio },
    { label: 'Language', value: language },
  ].filter((detail): detail is TitleDetailMetric => Boolean(detail.value));
}

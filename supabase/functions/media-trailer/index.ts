import {
  errorResponse,
  handleOptions,
  HttpError,
  jsonResponse,
} from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { fetchTmdb } from '../_shared/tmdb.ts';

type MediaTrailerRequest = {
  source?: unknown;
  sourceId?: unknown;
};

type ParsedSourceId = {
  kind: 'movie' | 'tv';
  tmdbId: string;
};

type TmdbVideo = {
  iso_639_1?: string | null;
  key?: string;
  name?: string;
  official?: boolean;
  published_at?: string;
  site?: string;
  type?: string;
};

type TmdbVideosResponse = {
  results?: TmdbVideo[];
};

function parseRequest(body: MediaTrailerRequest): ParsedSourceId {
  if (body.source !== 'tmdb' || typeof body.sourceId !== 'string') {
    throw new HttpError(400, 'A TMDB source id is required.');
  }

  const match = /^(movie|tv):(\d+)$/.exec(body.sourceId.trim());

  if (!match) {
    throw new HttpError(400, 'Invalid TMDB source id.');
  }

  return {
    kind: match[1] as ParsedSourceId['kind'],
    tmdbId: match[2],
  };
}

function isUsableYoutubeTrailer(video: TmdbVideo): video is TmdbVideo & {
  key: string;
} {
  return (
    video.site?.toLowerCase() === 'youtube' &&
    video.type?.toLowerCase() === 'trailer' &&
    typeof video.key === "string" &&
    /^[A-Za-z0-9_-]{6,}$/.test(video.key)
  );
}

function publishedAt(video: TmdbVideo) {
  const value = Date.parse(video.published_at ?? '');
  return Number.isNaN(value) ? 0 : value;
}

function selectTrailer(videos: TmdbVideo[]) {
  return videos.filter(isUsableYoutubeTrailer).sort((left, right) => {
    const officialDifference =
      Number(right.official === true) - Number(left.official === true);

    if (officialDifference !== 0) {
      return officialDifference;
    }

    const englishDifference =
      Number(right.iso_639_1 === 'en') - Number(left.iso_639_1 === 'en');

    if (englishDifference !== 0) {
      return englishDifference;
    }

    return publishedAt(right) - publishedAt(left);
  })[0];
}

Deno.serve(async (request) => {
  const optionsResponse = handleOptions(request);

  if (optionsResponse) {
    return optionsResponse;
  }

  try {
    if (request.method !== "POST") {
      throw new HttpError(405, 'Method not allowed.');
    }

    await requireAuth(request);

    const { kind, tmdbId } = parseRequest(
      (await request.json()) as MediaTrailerRequest,
    );
    const response = await fetchTmdb<TmdbVideosResponse>(
      `/${kind}/${tmdbId}/videos`,
      { language: 'en-US' },
    );
    const trailer = selectTrailer(response.results ?? []);

    return jsonResponse({
      trailer: trailer
        ? {
            key: trailer.key,
            name: trailer.name?.trim() || 'Trailer',
            site: 'YouTube',
          }
        : null,
    });
  } catch (error) {
    return errorResponse(error);
  }
});

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;

type RequestBucket = {
  count: number;
  startedAt: number;
};

function requestKey(request: Request) {
  return (
    request.headers.get('x-real-ip') ??
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

/** Per-isolate guardrail; platform rate limiting remains an additional boundary. */
export function createPublicTitleRequestThrottle(
  now: () => number = () => Date.now(),
) {
  const buckets = new Map<string, RequestBucket>();

  return (request: Request) => {
    const key = requestKey(request);
    const currentTime = now();
    const existing = buckets.get(key);

    if (!existing || currentTime - existing.startedAt >= WINDOW_MS) {
      buckets.set(key, { count: 1, startedAt: currentTime });
      return true;
    }

    if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
      return false;
    }

    existing.count += 1;
    return true;
  };
}

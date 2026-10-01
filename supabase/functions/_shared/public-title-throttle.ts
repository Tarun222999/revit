const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;
const MAX_RETAINED_BUCKETS = 512;

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
  maxBuckets = MAX_RETAINED_BUCKETS,
) {
  const buckets = new Map<string, RequestBucket>();

  const removeExpiredBuckets = (currentTime: number) => {
    for (const [key, bucket] of buckets) {
      if (currentTime - bucket.startedAt >= WINDOW_MS) {
        buckets.delete(key);
      }
    }
  };

  const evictOldestBucket = () => {
    let oldestKey: string | undefined;
    let oldestStartedAt = Number.POSITIVE_INFINITY;

    for (const [key, bucket] of buckets) {
      if (bucket.startedAt < oldestStartedAt) {
        oldestKey = key;
        oldestStartedAt = bucket.startedAt;
      }
    }

    if (oldestKey) buckets.delete(oldestKey);
  };

  return (request: Request) => {
    const key = requestKey(request);
    const currentTime = now();
    removeExpiredBuckets(currentTime);
    const existing = buckets.get(key);

    if (!existing) {
      if (buckets.size >= maxBuckets) {
        evictOldestBucket();
      }
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

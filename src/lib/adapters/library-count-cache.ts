/**
 * Library totals (series, movies, artists, books) change rarely, but the *arr APIs only
 * expose them by returning the entire library. Fetching that on every poll made JSON
 * download/parse the dominant server CPU cost, so totals are refreshed at most every
 * LIBRARY_COUNT_TTL_MS per service and concurrent polls share one request.
 */
export const LIBRARY_COUNT_TTL_MS = 10 * 60 * 1000;

const counts = new Map<string, { value: number; expiresAt: number }>();
const inflight = new Map<string, Promise<number>>();

export function cachedLibraryCount(key: string, load: () => Promise<number>): Promise<number> {
  const cached = counts.get(key);
  if (cached && Date.now() < cached.expiresAt) return Promise.resolve(cached.value);
  const running = inflight.get(key);
  if (running) return running;
  const request = load()
    .then((value) => {
      counts.set(key, { value, expiresAt: Date.now() + LIBRARY_COUNT_TTL_MS });
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, request);
  return request;
}

export function clearLibraryCountCache(): void {
  counts.clear();
  inflight.clear();
}

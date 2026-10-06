const publicContentCache = new Map<string, { data: unknown; savedAt: number }>();
const publicContentRequests = new Map<string, Promise<unknown>>();
const CACHE_TTL_MS = 60_000;

export function readPublicContent<T>(path: string): T | null {
  const cached = publicContentCache.get(path);
  if (!cached || Date.now() - cached.savedAt > CACHE_TTL_MS) return null;
  return cached.data as T;
}

export function loadPublicContent<T>(path: string, force = false): Promise<T> {
  if (!force) {
    const cached = readPublicContent<T>(path);
    if (cached !== null) return Promise.resolve(cached);
    const pending = publicContentRequests.get(path);
    if (pending) return pending as Promise<T>;
  }

  const request = fetch(`${import.meta.env.VITE_API_URL || "/api"}${path}`, {
    headers: { Accept: "application/json" },
  })
    .then(async (response) => {
      if (!response.ok) throw new Error(response.status === 404 ? "This content is not available." : "We could not load this content. Please try again.");
      return response.json() as Promise<T>;
    })
    .then((data) => {
      publicContentCache.set(path, { data, savedAt: Date.now() });
      return data;
    })
    .finally(() => {
      if (publicContentRequests.get(path) === request) publicContentRequests.delete(path);
    });

  publicContentRequests.set(path, request);
  return request;
}

export function prefetchPublicContent(path: string): void {
  void loadPublicContent(path).catch(() => {
    // Keep the page's normal retry/error state responsible for failed requests.
  });
}

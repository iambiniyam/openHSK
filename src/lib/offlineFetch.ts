const OFFLINE_DATA_CACHE = 'openhsk-data-runtime-v1';

const canUseCacheStorage = (): boolean => {
  return typeof window !== 'undefined' && 'caches' in window;
};

const isCacheableResponse = (response: Response): boolean => {
  return response.ok || response.status === 0;
};

async function readCachedResponse(request: Request): Promise<Response | undefined> {
  if (!canUseCacheStorage()) return undefined;

  try {
    const cache = await caches.open(OFFLINE_DATA_CACHE);
    return (await cache.match(request)) ?? undefined;
  } catch {
    return undefined;
  }
}

async function writeCachedResponse(request: Request, response: Response): Promise<void> {
  if (!canUseCacheStorage()) return;

  try {
    const cache = await caches.open(OFFLINE_DATA_CACHE);
    await cache.put(request, response);
  } catch {
    // Ignore cache write errors; network response remains valid.
  }
}

export async function fetchWithCacheFallback(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const request = input instanceof Request ? input : new Request(input.toString(), init);
  const shouldCache = request.method.toUpperCase() === 'GET';

  try {
    const response = await fetch(request.clone());

    if (!isCacheableResponse(response)) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    if (shouldCache) {
      await writeCachedResponse(request, response.clone());
    }

    return response;
  } catch (error) {
    if (shouldCache) {
      const cached = await readCachedResponse(request);
      if (cached) {
        return cached;
      }
    }

    throw error;
  }
}

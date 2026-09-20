export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Fetch JSON with an optional external AbortSignal plus an internal timeout.
 * Used by all live data services so that stale/slow requests never hang
 * the UI and can always be cancelled when the user changes location quickly.
 */
export async function fetchJson<T>(
  url: string,
  opts: { signal?: AbortSignal; timeoutMs?: number } = {}
): Promise<T> {
  const { signal, timeoutMs = 12000 } = opts;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  // Bridge an external signal (e.g. from a fetch coordinator) into this request.
  const onExternalAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    signal.addEventListener('abort', onExternalAbort);
  }

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new ApiError(`Request failed with status ${res.status}`, res.status);
    }
    return (await res.json()) as T;
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('Request timed out or was cancelled');
    }
    if (err instanceof ApiError) throw err;
    throw new ApiError(err instanceof Error ? err.message : 'Network request failed');
  } finally {
    clearTimeout(timeout);
    if (signal) signal.removeEventListener('abort', onExternalAbort);
  }
}

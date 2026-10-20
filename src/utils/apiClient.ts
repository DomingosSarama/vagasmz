/** Same-origin API calls with a deadline for both headers and response body. */
export async function fetchApiJson<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs = 12000,
  fetcher: typeof fetch = fetch,
): Promise<{ ok: boolean; status: number; data: T }> {
  if (!path.startsWith('/api/') || path.includes('\\')) throw new Error('Endereço de serviço inválido.');
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (init.signal?.aborted) abort();
  init.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, timeoutMs);
  try {
    const response = await fetcher(path, {
      ...init,
      signal: controller.signal,
      cache: 'no-store',
      credentials: 'same-origin',
    });
    if (response.status === 401 && typeof window !== 'undefined') window.location.replace('/login');
    const data = await response.json() as T;
    return { ok: response.ok, status: response.status, data };
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener('abort', abort);
  }
}

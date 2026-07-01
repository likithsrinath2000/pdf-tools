import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, getQueryFn, queryClient } from './queryClient';

afterEach(() => vi.restoreAllMocks());

describe('queryClient', () => {
  it('sends JSON requests and returns successful responses', async () => {
    const response = new Response(JSON.stringify({ ok: true }), { status: 200 });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);

    await expect(apiRequest('POST', '/api/thing', { a: 1 })).resolves.toBe(response);

    expect(fetchMock).toHaveBeenCalledWith('/api/thing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ a: 1 }),
      credentials: 'include',
    });
  });

  it('omits JSON headers without data and throws response text on errors', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('', { status: 200 }))
      .mockResolvedValueOnce(new Response('bad request', { status: 400, statusText: 'Bad' }));

    await expect(apiRequest('GET', '/api/thing')).resolves.toBeInstanceOf(Response);
    expect(fetch).toHaveBeenCalledWith('/api/thing', expect.objectContaining({ headers: {}, body: undefined }));
    await expect(apiRequest('GET', '/api/bad')).rejects.toThrow('400: bad request');
  });

  it('query function returns null for configured 401 or throws otherwise', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
      .mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ value: 1 }), { status: 200 }));

    await expect(getQueryFn({ on401: 'returnNull' })({ queryKey: ['/api', 'me'] } as any)).resolves.toBeNull();
    await expect(getQueryFn({ on401: 'throw' })({ queryKey: ['/api', 'me'] } as any)).rejects.toThrow('401: unauthorized');
    await expect(getQueryFn<{ value: number }>({ on401: 'throw' })({ queryKey: ['/api', 'ok'] } as any)).resolves.toEqual({ value: 1 });
    expect(fetch).toHaveBeenLastCalledWith('/api/ok', { credentials: 'include' });
  });

  it('configures default query and mutation options', () => {
    const options = queryClient.getDefaultOptions();
    expect(options.queries?.refetchOnWindowFocus).toBe(false);
    expect(options.queries?.staleTime).toBe(5 * 60 * 1000);
    expect(options.queries?.gcTime).toBe(30 * 60 * 1000);
    expect(options.queries?.retry).toBe(3);
    expect((options.queries?.retryDelay as any)(2)).toBe(4000);
    expect(options.mutations?.retry).toBe(1);
    expect(options.mutations?.retryDelay).toBe(1000);
  });
});

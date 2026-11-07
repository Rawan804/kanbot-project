import { beforeEach, describe, expect, it, vi } from 'vitest';
import { request, setUnauthorizedHandler } from './client';

describe('API request client', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('kanbot.token', 'test-token');
    setUnauthorizedHandler(null);
    vi.restoreAllMocks();
  });

  it('sends the stored bearer token and parses JSON responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ value: 42 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(request<{ value: number }>('GET', '/test')).resolves.toEqual({ value: 42 });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
  });

  it('notifies the auth handler and surfaces structured unauthorized errors', async () => {
    const unauthorized = vi.fn();
    setUnauthorizedHandler(unauthorized);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Expired' } }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(request('GET', '/projects')).rejects.toMatchObject({
      status: 401,
      message: 'Expired',
    });
    expect(unauthorized).toHaveBeenCalledOnce();
  });

  it('returns undefined for a successful no-content response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(request('DELETE', '/test')).resolves.toBeUndefined();
  });
});

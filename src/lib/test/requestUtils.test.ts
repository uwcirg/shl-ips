// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchParsed, parseBody, retry } from '$lib/utils/requestUtils';

// Keep backoff negligible so retries don't slow the suite down.
const FAST = { baseDelayMs: 1 };

function response(status: number, body: string) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: `status ${status}`,
    headers: new Headers(),
    text: vi.fn().mockResolvedValue(body)
  };
}

// Mimics a body cut short mid-transfer: fetch() resolves but reading the body rejects.
function truncatedResponse() {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    text: vi.fn().mockRejectedValue(new TypeError('Content-Length header of network response exceeds response Body.'))
  };
}

describe('parseBody', () => {
  it('parses valid JSON', () => {
    expect(parseBody('{"a":1}')).toEqual({ a: 1 });
    expect(parseBody('[1,2]')).toEqual([1, 2]);
  });

  it('returns the raw text when the body is not JSON', () => {
    expect(parseBody('<html>Bad Gateway</html>')).toBe('<html>Bad Gateway</html>');
    expect(parseBody('<?xml version="1.0"?><error/>')).toBe('<?xml version="1.0"?><error/>');
  });

  it('returns an empty string for an empty body', () => {
    expect(parseBody('')).toBe('');
  });

  it('returns the raw text for a truncated JSON string', () => {
    expect(parseBody('{"a":1,"b"')).toBe('{"a":1,"b"');
  });
});

describe('retry', () => {
  it('returns the result without retrying when the first attempt succeeds', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const onRetry = vi.fn();

    await expect(retry(fn, { ...FAST, onRetry })).resolves.toBe('ok');

    expect(fn).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('retries a TypeError and returns the eventual result', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('network'))
      .mockRejectedValueOnce(new TypeError('network'))
      .mockResolvedValue('ok');
    const onRetry = vi.fn();

    await expect(retry(fn, { ...FAST, onRetry })).resolves.toBe('ok');

    expect(fn).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry.mock.calls[0][1]).toBe(1);
    expect(onRetry.mock.calls[1][1]).toBe(2);
  });

  it('passes the attempt number to the function', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new TypeError('network')).mockResolvedValue('ok');

    await retry(fn, { ...FAST, onRetry: vi.fn() });

    expect(fn.mock.calls.map((c) => c[0])).toEqual([1, 2]);
  });

  it('does not retry errors that are not network failures', async () => {
    const error = new Error('bad input');
    const fn = vi.fn().mockRejectedValue(error);

    await expect(retry(fn, { ...FAST, onRetry: vi.fn() })).rejects.toBe(error);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throws the last error once attempts are exhausted', async () => {
    const last = new TypeError('third');
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('first'))
      .mockRejectedValueOnce(new TypeError('second'))
      .mockRejectedValueOnce(last);

    await expect(retry(fn, { ...FAST, attempts: 3, onRetry: vi.fn() })).rejects.toBe(last);

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('honors a custom attempts count', async () => {
    const fn = vi.fn().mockRejectedValue(new TypeError('network'));

    await expect(retry(fn, { ...FAST, attempts: 5, onRetry: vi.fn() })).rejects.toThrow('network');

    expect(fn).toHaveBeenCalledTimes(5);
  });

  it('uses a custom shouldRetry', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('flaky')).mockResolvedValue('ok');

    const result = await retry(fn, {
      ...FAST,
      onRetry: vi.fn(),
      shouldRetry: (error) => (error as Error).message === 'flaky'
    });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry after the signal has aborted', async () => {
    const controller = new AbortController();
    const fn = vi.fn().mockImplementation(async () => {
      controller.abort();
      throw new TypeError('network');
    });

    await expect(
      retry(fn, { ...FAST, signal: controller.signal, onRetry: vi.fn() })
    ).rejects.toThrow('network');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('logs a warning by default when retrying', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fn = vi.fn().mockRejectedValueOnce(new TypeError('network')).mockResolvedValue('ok');

    await retry(fn, FAST);

    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe('fetchParsed', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    warn.mockRestore();
  });

  it('passes the request through and parses a JSON body', async () => {
    fetchMock.mockResolvedValue(response(200, '{"id":"abc"}'));
    const init = { method: 'GET', headers: { Authorization: 'Bearer t' } };

    const result = await fetchParsed('https://example.com/x', init, FAST);

    expect(fetchMock).toHaveBeenCalledWith('https://example.com/x', init);
    expect(result).toMatchObject({ ok: true, status: 200, body: { id: 'abc' } });
  });

  it('returns a non-JSON body as raw text', async () => {
    fetchMock.mockResolvedValue(response(200, 'plain text'));

    const result = await fetchParsed('https://example.com/x', {}, FAST);

    expect(result.body).toBe('plain text');
  });

  it('returns a non-ok response without throwing or retrying, and reports it', async () => {
    fetchMock.mockResolvedValue(response(500, '<html>Server Error</html>'));
    const onErrorResponse = vi.fn();

    const result = await fetchParsed('https://example.com/x', {}, { ...FAST, onErrorResponse });

    expect(result).toMatchObject({ ok: false, status: 500, body: '<html>Server Error</html>' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onErrorResponse).toHaveBeenCalledTimes(1);
    expect(onErrorResponse).toHaveBeenCalledWith(expect.objectContaining({ status: 500 }));
  });

  it('parses a JSON error body before reporting it', async () => {
    fetchMock.mockResolvedValue(response(404, '{"message":"Deleted"}'));
    const onErrorResponse = vi.fn();

    await fetchParsed('https://example.com/x', {}, { ...FAST, onErrorResponse });

    expect(onErrorResponse.mock.calls[0][0].body).toEqual({ message: 'Deleted' });
  });

  it('does not call onErrorResponse for ok responses', async () => {
    fetchMock.mockResolvedValue(response(200, '{}'));
    const onErrorResponse = vi.fn();

    await fetchParsed('https://example.com/x', {}, { ...FAST, onErrorResponse });

    expect(onErrorResponse).not.toHaveBeenCalled();
  });

  it('retries when the body is cut short mid-transfer', async () => {
    fetchMock
      .mockResolvedValueOnce(truncatedResponse())
      .mockResolvedValueOnce(response(200, '[{"id":1}]'));

    const result = await fetchParsed('https://example.com/x', {}, FAST);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.body).toEqual([{ id: 1 }]);
  });

  it('retries when fetch itself rejects', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(response(200, '{"ok":true}'));

    const result = await fetchParsed('https://example.com/x', {}, FAST);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.body).toEqual({ ok: true });
  });

  it('throws once network failures outlast the attempts', async () => {
    fetchMock.mockResolvedValue(truncatedResponse());

    await expect(fetchParsed('https://example.com/x', {}, FAST)).rejects.toThrow(/Content-Length/);

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('honors a custom attempts count', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(fetchParsed('https://example.com/x', {}, { ...FAST, attempts: 2 })).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-idempotent methods by default', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      fetchParsed('https://example.com/x', { method: 'POST', body: '{}' }, FAST)
    ).rejects.toThrow('Failed to fetch');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a POST when it is marked idempotent', async () => {
    fetchMock
      .mockResolvedValueOnce(truncatedResponse())
      .mockResolvedValueOnce(response(200, '[]'));

    const result = await fetchParsed(
      'https://example.com/user',
      { method: 'POST', body: '{}' },
      { ...FAST, idempotent: true }
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.body).toEqual([]);
  });

  it('retries PUT and DELETE only when marked idempotent', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(fetchParsed('https://example.com/x', { method: 'PUT' }, FAST)).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockClear();
    await expect(
      fetchParsed('https://example.com/x', { method: 'DELETE' }, { ...FAST, idempotent: true })
    ).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries the configured statuses and returns the eventual success', async () => {
    fetchMock
      .mockResolvedValueOnce(response(503, 'Service Unavailable'))
      .mockResolvedValueOnce(response(200, '{"ok":true}'));
    const onErrorResponse = vi.fn();

    const result = await fetchParsed(
      'https://example.com/x',
      {},
      { ...FAST, retryStatuses: [502, 503, 504], onErrorResponse }
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ ok: true, body: { ok: true } });
    expect(onErrorResponse).not.toHaveBeenCalled();
  });

  it('returns the last response, rather than throwing, when a retried status persists', async () => {
    fetchMock.mockResolvedValue(response(503, 'Service Unavailable'));
    const onErrorResponse = vi.fn();

    const result = await fetchParsed(
      'https://example.com/x',
      {},
      { ...FAST, retryStatuses: [503], onErrorResponse }
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({ ok: false, status: 503, body: 'Service Unavailable' });
    expect(onErrorResponse).toHaveBeenCalledTimes(1);
  });

  it('does not retry statuses that are not configured', async () => {
    fetchMock.mockResolvedValue(response(500, 'oops'));

    const result = await fetchParsed(
      'https://example.com/x',
      {},
      { ...FAST, retryStatuses: [503] }
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(500);
  });

  it('does not retry once the request signal has aborted', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(async () => {
      controller.abort();
      throw new TypeError('Failed to fetch');
    });

    await expect(
      fetchParsed('https://example.com/x', { signal: controller.signal }, FAST)
    ).rejects.toThrow('Failed to fetch');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

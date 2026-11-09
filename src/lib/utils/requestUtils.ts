/**
 * Helpers for making requests that tolerate transient network failures.
 *
 * Failures such as a response body cut short mid-transfer
 * (NS_ERROR_NET_PARTIAL_TRANSFER / "Content-Length header of network response
 * exceeds response Body") surface when the body is read, not when fetch()
 * resolves. fetchParsed therefore retries the fetch and the body read as one unit.
 *
 * Only retry requests that are safe to repeat. Creating requests (e.g. most POSTs)
 * and single-use exchanges (e.g. OAuth code exchange) must not be retried.
 */

export interface RetryOptions {
  /** Total attempts including the first. Default 3. */
  attempts?: number;
  /** Delay before the first retry; doubles each attempt, with jitter. Default 250ms. */
  baseDelayMs?: number;
  /**
   * Decides whether a thrown error is worth another attempt. By default only
   * network-level failures (TypeError, which covers fetch failures and truncated
   * bodies) are retried, and never after the caller's signal has aborted.
   */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Called before each retry. Defaults to console.warn. */
  onRetry?: (error: unknown, attempt: number) => void;
  /** Stops retrying once aborted. */
  signal?: AbortSignal | null;
}

const DEFAULT_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 250;

function defaultShouldRetry(error: unknown): boolean {
  return error instanceof TypeError;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs fn, retrying with exponential backoff and jitter when it throws a
 * retryable error. Throws the last error once attempts are exhausted.
 */
export async function retry<T>(
  fn: (attempt: number) => Promise<T>,
  {
    attempts = DEFAULT_ATTEMPTS,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    shouldRetry = defaultShouldRetry,
    onRetry = (error, attempt) =>
      console.warn(`Request failed (attempt ${attempt} of ${attempts}), retrying`, error),
    signal
  }: RetryOptions = {}
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      if (attempt >= attempts || signal?.aborted || !shouldRetry(error, attempt)) {
        throw error;
      }
      onRetry(error, attempt);
      await delay(baseDelayMs * 2 ** (attempt - 1) * (0.5 + Math.random() * 0.5));
      if (signal?.aborted) {
        throw error;
      }
    }
  }
}

/**
 * Parses a response body that may or may not be JSON. External APIs often
 * return HTML, XML or plain text on failure, so anything that isn't valid JSON
 * is returned as the raw string.
 */
export function parseBody<T = unknown>(text: string): T | string {
  try {
    return JSON.parse(text) as T;
  } catch {
    return text;
  }
}

export interface ParsedResponse<T = unknown> {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  /** Parsed JSON when the body is valid JSON, otherwise the raw text (possibly empty). */
  body: T | string;
}

export interface FetchParsedOptions extends RetryOptions {
  /**
   * Whether the request is safe to repeat. Defaults to true for GET, HEAD and
   * OPTIONS and false otherwise; when false only a single attempt is made.
   * Pass true for reads that happen to use another method (e.g. a POST that
   * only fetches data).
   */
  idempotent?: boolean;
  /** HTTP statuses that should also be retried (e.g. [502, 503, 504]). Default none. */
  retryStatuses?: number[];
  /** Called with the parsed response when the final result is not ok, e.g. to log it. */
  onErrorResponse?: (response: ParsedResponse) => void;
}

/**
 * Fetches a URL and reads the whole body as text, then parses it as JSON when
 * possible (see parseBody). The fetch and body read are retried together, so
 * truncated transfers are retried like any other network failure.
 *
 * Non-ok responses are returned, not thrown, so callers decide how to handle
 * them. Network failures that outlast the retries are thrown.
 */
export async function fetchParsed<T = unknown>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: FetchParsedOptions = {}
): Promise<ParsedResponse<T>> {
  const method = (init.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const idempotent = options.idempotent ?? ['GET', 'HEAD', 'OPTIONS'].includes(method);
  const retryStatuses = options.retryStatuses ?? [];
  const retryable = Symbol('retryable status');

  let last: ParsedResponse<T> | undefined;
  try {
    return await retry(
      async () => {
        const response = await fetch(input, init);
        const text = await response.text();
        const parsed: ParsedResponse<T> = {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          body: parseBody<T>(text)
        };
        if (!response.ok) {
          last = parsed;
          if (retryStatuses.includes(response.status)) {
            throw Object.assign(new Error(`HTTP ${response.status}`), { [retryable]: true });
          }
          options.onErrorResponse?.(parsed);
        }
        return parsed;
      },
      {
        signal: init.signal ?? options.signal,
        ...options,
        attempts: idempotent ? options.attempts : 1,
        shouldRetry: (error, attempt) =>
          (error as { [retryable]?: boolean })?.[retryable] === true ||
          (options.shouldRetry ?? defaultShouldRetry)(error, attempt)
      }
    );
  } catch (error) {
    // Retries exhausted on a retryable status: hand back the last response instead of throwing.
    if (last && (error as { [retryable]?: boolean })?.[retryable]) {
      options.onErrorResponse?.(last);
      return last;
    }
    throw error;
  }
}

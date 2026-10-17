// -----------------------------------------------------------------------------
// HTTP for the two public APIs, with their rules:
//   - an explicit User-Agent with a contact (asked by Chess.com);
//   - one request at a time per host (asked by Lichess, polite for Chess.com);
//   - after a 429, no request to that host for a minute (Lichess: "wait a full
//     minute"), the callers get a RateLimitedError meanwhile;
//   - a timeout, so a hung API never blocks a cycle, a widget or an action;
//   - conditional requests (ETag) when asked: a Chess.com month of games is
//     up to a megabyte, and most cycles get a 304 instead.
// -----------------------------------------------------------------------------

export const USER_AGENT = 'gladys-chess (+https://github.com/guim31/gladys-chess)';

/** How long a host is left alone after a 429. */
export const RATE_LIMIT_PAUSE_MS = 60_000;

const TIMEOUT_MS = 10_000;

/** An HTTP answer that is not a success. */
export class HttpError extends Error {
  /**
   * @param {number} status 0 for a network failure
   * @param {string} message
   */
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

/** The host asked us to slow down: no request until `until`. */
export class RateLimitedError extends HttpError {
  constructor(host, until) {
    super(429, `${host}: rate limited, paused for a minute`);
    this.name = 'RateLimitedError';
    this.until = until;
  }
}

/** A failure of the service rather than of one player: network, rate limit, server error. */
export function isTransient(err) {
  return !(err instanceof HttpError) || err.status === 0 || err.status === 429 || err.status >= 500;
}

/**
 * @param {object} [options]
 * @param {typeof fetch} [options.fetch]
 * @param {() => number} [options.now]
 */
export function createHttp({ fetch = globalThis.fetch, now = () => Date.now() } = {}) {
  /** Per host: the tail of its queue, and the end of a 429 pause. */
  const hosts = new Map();
  /** Conditional request cache: url -> { etag, body }. */
  const cache = new Map();

  function hostState(host) {
    let state = hosts.get(host);
    if (!state) {
      state = { tail: Promise.resolve(), pausedUntil: 0 };
      hosts.set(host, state);
    }
    return state;
  }

  async function send(url, { accept, conditional }) {
    const host = new URL(url).host;
    const state = hostState(host);
    if (now() < state.pausedUntil) {
      throw new RateLimitedError(host, state.pausedUntil);
    }
    const headers = { 'user-agent': USER_AGENT, accept };
    const cached = conditional ? cache.get(url) : undefined;
    if (cached) {
      headers['if-none-match'] = cached.etag;
    }
    let response;
    try {
      response = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (err) {
      const reason = err?.name === 'TimeoutError' ? 'timeout' : (err?.cause?.code ?? err.message);
      throw new HttpError(0, `${host}: ${reason}`);
    }
    if (response.status === 304 && cached) {
      return cached.body;
    }
    if (response.status === 429) {
      state.pausedUntil = now() + RATE_LIMIT_PAUSE_MS;
      throw new RateLimitedError(host, state.pausedUntil);
    }
    if (!response.ok) {
      throw new HttpError(response.status, `${host}: HTTP ${response.status}`);
    }
    const body = await response.text();
    const etag = response.headers.get('etag');
    if (conditional && etag) {
      cache.set(url, { etag, body });
    }
    return body;
  }

  /**
   * GET a URL, queued behind the other requests to its host.
   * @param {string} url
   * @param {{ accept?: string, conditional?: boolean }} [options]
   * @returns {Promise<string>} the body
   */
  function get(url, { accept = 'application/json', conditional = false } = {}) {
    const state = hostState(new URL(url).host);
    const run = state.tail.then(() => send(url, { accept, conditional }));
    state.tail = run.catch(() => {});
    return run;
  }

  return {
    get,
    /** GET and parse JSON. */
    async json(url, options) {
      const body = await get(url, options);
      try {
        return JSON.parse(body);
      } catch {
        throw new HttpError(502, `${new URL(url).host}: invalid JSON`);
      }
    },
    /** GET newline-delimited JSON (Lichess game exports). */
    async ndjson(url) {
      const body = await get(url, { accept: 'application/x-ndjson' });
      return body
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line) => JSON.parse(line));
    },
    /** Forget the cached bodies of URLs no longer read (months gone by). */
    forget(predicate) {
      for (const url of cache.keys()) {
        if (predicate(url)) {
          cache.delete(url);
        }
      }
    },
  };
}

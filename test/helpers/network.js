// -----------------------------------------------------------------------------
// A simulated network: the public Lichess and Chess.com APIs, answering with
// the real answers recorded in test/fixtures (17/10/2026). Tests never touch
// the real network. Every answer can be changed while a test runs.
// -----------------------------------------------------------------------------

import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../fixtures/${path}`, import.meta.url), 'utf8');

/** A JSON fixture. */
export const fixture = (path) => JSON.parse(read(path));

/** The games of a Lichess NDJSON fixture, newest first. */
export const lichessGames = (name) =>
  read(`lichess/games-${name}.ndjson`)
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));

/** A Lichess game played by `id` against `opponent`, ended at `endedAt`. */
export function lichessGame(
  id,
  { gameId, endedAt, winner = 'white', speed = 'blitz', rating = 1750, diff = 6 },
) {
  return {
    id: gameId,
    rated: true,
    variant: 'standard',
    speed,
    perf: speed,
    createdAt: endedAt - 300_000,
    lastMoveAt: endedAt,
    status: winner ? 'resign' : 'draw',
    players: {
      white: { user: { name: id, id }, rating, ratingDiff: winner === 'white' ? diff : -diff },
      black: { user: { name: 'Opponent42', id: 'opponent42' }, rating: 1760 },
    },
    ...(winner ? { winner } : {}),
  };
}

/** A Chess.com game played by `username`, ended at `endedAt` (ms). */
export function chesscomGame(
  username,
  { endedAt, result = 'win', timeClass = 'blitz', rating = 3000 },
) {
  return {
    url: `https://www.chess.com/game/live/${endedAt}`,
    uuid: `uuid-${endedAt}`,
    end_time: Math.floor(endedAt / 1000),
    rated: true,
    time_class: timeClass,
    rules: 'chess',
    white: { username, rating, result },
    black: { username: 'Opponent42', rating: 2900, result: result === 'win' ? 'resigned' : 'win' },
  };
}

/**
 * @param {object} [options]
 * @param {string[]} [options.lichess] Lichess fixture names served (thibault, drnykterstein)
 * @param {string[]} [options.chesscom] Chess.com fixture names served (hikaru, erik)
 */
export function createNetwork({ lichess = [], chesscom = [] } = {}) {
  const calls = [];
  const state = {
    /** Lichess users by id. */
    users: Object.fromEntries(lichess.map((n) => [n, fixture(`lichess/user-${n}.json`)])),
    /** Lichess games by id, newest first. */
    games: Object.fromEntries(lichess.map((n) => [n, lichessGames(n)])),
    history: Object.fromEntries(
      lichess.map((n) => [n, fixture(`lichess/rating-history-${n}.json`)]),
    ),
    /** Lichess statuses, by id: { online, playing }. */
    statuses: {},
    profiles: Object.fromEntries(chesscom.map((n) => [n, fixture(`chesscom/player-${n}.json`)])),
    stats: Object.fromEntries(chesscom.map((n) => [n, fixture(`chesscom/stats-${n}.json`)])),
    /** Chess.com archives by "<user>/<YYYY>/<MM>": the games, oldest first. */
    archives: Object.fromEntries(
      chesscom.map((n) => [`${n}/2026/10`, fixture(`chesscom/games-${n}-2026-10.json`).games]),
    ),
    /** An answer forced for every request to a host: { status } or an Error. */
    down: {},
  };

  const json = (body, status = 200, headers = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    });
  const notFound = () => json({ error: 'Not found' }, 404);

  function lichessRoute(url) {
    const path = url.pathname;
    let match;
    if ((match = /^\/api\/user\/([^/]+)$/.exec(path))) {
      const user = state.users[match[1]];
      return user ? json(user) : notFound();
    }
    if ((match = /^\/api\/user\/([^/]+)\/rating-history$/.exec(path))) {
      return state.history[match[1]] ? json(state.history[match[1]]) : notFound();
    }
    if (path === '/api/users/status') {
      const ids = url.searchParams.get('ids').split(',');
      return json(
        ids
          .filter((id) => state.users[id])
          .map((id) => ({
            id,
            name: state.users[id].username,
            ...(state.statuses[id]?.online ? { online: true } : {}),
            ...(state.statuses[id]?.playing ? { playing: true } : {}),
          })),
      );
    }
    if ((match = /^\/api\/games\/user\/([^/]+)$/.exec(path))) {
      const since = Number(url.searchParams.get('since') ?? 0);
      const max = Number(url.searchParams.get('max') ?? 100);
      const games = (state.games[match[1]] ?? [])
        .filter((game) => game.createdAt >= since)
        .slice(0, max);
      return new Response(games.map((game) => JSON.stringify(game)).join('\n') + '\n', {
        headers: { 'content-type': 'application/x-ndjson' },
      });
    }
    if (path === '/api/puzzle/daily') {
      return json(fixture('lichess/puzzle-daily.json'));
    }
    return notFound();
  }

  function chesscomRoute(url, headers) {
    const path = url.pathname;
    let match;
    if ((match = /^\/pub\/player\/([^/]+)$/.exec(path))) {
      return state.profiles[match[1]] ? json(state.profiles[match[1]]) : notFound();
    }
    if ((match = /^\/pub\/player\/([^/]+)\/stats$/.exec(path))) {
      return state.stats[match[1]] ? json(state.stats[match[1]]) : notFound();
    }
    if ((match = /^\/pub\/player\/([^/]+)\/games\/(\d{4}\/\d{2})$/.exec(path))) {
      if (!state.profiles[match[1]]) {
        return notFound();
      }
      const games = state.archives[`${match[1]}/${match[2]}`] ?? [];
      // A weak ETag of the content, as Chess.com sends.
      const etag = `W/"${games.length}-${games.at(-1)?.end_time ?? 0}"`;
      if (headers['if-none-match'] === etag) {
        return new Response(null, { status: 304, headers: { etag } });
      }
      return json({ games }, 200, { etag });
    }
    if (path === '/pub/puzzle') {
      return json(fixture('chesscom/puzzle.json'));
    }
    return notFound();
  }

  async function fetch(href, options = {}) {
    const url = new URL(String(href));
    const headers = options.headers ?? {};
    calls.push({ url: url.href, host: url.host, headers });
    const down = state.down[url.host];
    if (down instanceof Error) {
      throw down;
    }
    if (down) {
      return json({ error: 'down' }, down.status);
    }
    if (url.host === 'lichess.org') {
      return lichessRoute(url);
    }
    if (url.host === 'api.chess.com') {
      return chesscomRoute(url, headers);
    }
    throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } });
  }

  return {
    fetch,
    calls,
    state,
    /** The calls whose URL contains `part`. */
    count: (part) => calls.filter((call) => call.url.includes(part)).length,
  };
}

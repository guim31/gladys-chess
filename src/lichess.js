// -----------------------------------------------------------------------------
// Lichess public API (https://lichess.org/api), read without an account.
//
//   GET /api/user/{id}                 ratings by speed, number of games
//   GET /api/users/status?ids=a,b      online / playing, one request for all
//   GET /api/games/user/{id}?since=…   the games, as NDJSON (no moves)
//   GET /api/user/{id}/rating-history  the best rating ever, read once
//   GET /api/puzzle/daily              the puzzle of the day
//
// Everything is turned into the common shapes of src/players.js: ratings by
// time control (bullet, blitz, rapid, classical, daily, puzzle) and games
// seen from the followed player.
// -----------------------------------------------------------------------------

import { HttpError } from './http.js';

const API = 'https://lichess.org/api';

/** Lichess perf -> our time control. Ultrabullet counts as bullet, correspondence as daily. */
const SPEED = {
  ultraBullet: 'bullet',
  bullet: 'bullet',
  blitz: 'blitz',
  rapid: 'rapid',
  classical: 'classical',
  correspondence: 'daily',
};

/** The ratings published, Lichess perf -> our key. */
const RATED = {
  bullet: 'bullet',
  blitz: 'blitz',
  rapid: 'rapid',
  classical: 'classical',
  correspondence: 'daily',
  puzzle: 'puzzle',
};

/** Statuses of a game that was never really played. */
const NOT_PLAYED = new Set(['created', 'started', 'aborted', 'noStart', 'unknownFinish']);

/** Most games read in one request (the newest first). */
export const MAX_GAMES = 100;

const enc = encodeURIComponent;

/** A username that does not exist, or a closed account. */
export class PlayerNotFoundError extends HttpError {
  constructor(name) {
    super(404, `${name}: no such player`);
    this.name = 'PlayerNotFoundError';
  }
}

/**
 * The profile of a player: display name, title, ratings, number of games.
 * @param {ReturnType<import('./http.js').createHttp>} http
 * @param {string} id lowercase username
 */
export async function fetchUser(http, id) {
  let user;
  try {
    user = await http.json(`${API}/user/${enc(id)}`);
  } catch (err) {
    throw err instanceof HttpError && err.status === 404 ? new PlayerNotFoundError(id) : err;
  }
  if (!user || typeof user !== 'object' || user.disabled || user.closed) {
    throw new PlayerNotFoundError(id);
  }
  const ratings = {};
  for (const [perf, key] of Object.entries(RATED)) {
    const stat = user.perfs?.[perf];
    // A rating never played is Lichess's default 1500: not a rating.
    if (stat && Number.isFinite(stat.rating) && stat.games > 0) {
      ratings[key] = { rating: stat.rating, games: stat.games, provisional: Boolean(stat.prov) };
    }
  }
  return {
    name: String(user.username ?? id),
    title: user.title ?? null,
    url: `https://lichess.org/@/${enc(user.username ?? id)}`,
    ratings,
    gameCount: Number(user.count?.all) || 0,
  };
}

/**
 * Online and playing, for several players in one request.
 * @returns {Promise<Map<string, { online: boolean, playing: boolean }>>} by lowercase id
 */
export async function fetchStatuses(http, ids) {
  const result = new Map();
  if (ids.length === 0) {
    return result;
  }
  const list = await http.json(`${API}/users/status?ids=${ids.map(enc).join(',')}`);
  for (const entry of Array.isArray(list) ? list : []) {
    // `online` and `playing` are only present when true.
    result.set(String(entry.id).toLowerCase(), {
      online: entry.online === true,
      playing: entry.playing === true,
    });
  }
  return result;
}

/**
 * The finished games of a player, the newest first.
 * @param {number | null} since only the games created after this time (ms)
 * @param {number} [max]
 */
export async function fetchGames(http, id, since, max = MAX_GAMES) {
  const params = new URLSearchParams({ max: String(max), moves: 'false', finished: 'true' });
  if (since !== null && since !== undefined) {
    params.set('since', String(Math.floor(since)));
  }
  const games = await http.ndjson(`${API}/games/user/${enc(id)}?${params}`);
  return games.map((game) => toGame(game, id)).filter(Boolean);
}

/**
 * A Lichess game seen from one of its players, null when it was not played.
 * @param {object} game a line of the NDJSON export
 * @param {string} id lowercase username of the followed player
 */
export function toGame(game, id) {
  if (!game?.id || NOT_PLAYED.has(game.status) || !game.players) {
    return null;
  }
  const color = game.players.white?.user?.id === id ? 'white' : 'black';
  const me = game.players[color] ?? {};
  const other = game.players[color === 'white' ? 'black' : 'white'] ?? {};
  let result = 'draw';
  if (game.winner) {
    result = game.winner === color ? 'win' : 'loss';
  }
  let opponent = other.user?.name;
  if (!opponent) {
    opponent = other.aiLevel ? `Stockfish ${other.aiLevel}` : 'Anonymous';
  }
  return {
    id: game.id,
    url: `https://lichess.org/${game.id}`,
    endedAt: Number(game.lastMoveAt ?? game.createdAt),
    result,
    timeControl: SPEED[game.speed] ?? 'daily',
    perf: perfOf(game),
    opponent: String(opponent),
    opponentRating: Number.isFinite(other.rating) ? other.rating : null,
    rating: Number.isFinite(me.rating) ? me.rating + (me.ratingDiff ?? 0) : null,
    ratingDiff: Number.isFinite(me.ratingDiff) ? me.ratingDiff : null,
    rated: game.rated === true,
  };
}

/** What a game was: its variant, else UltraBullet or its time control. */
function perfOf(game) {
  if (game.variant && game.variant !== 'standard') {
    return game.variant;
  }
  return game.speed === 'ultraBullet' ? 'ultraBullet' : (SPEED[game.speed] ?? 'daily');
}

/**
 * The best rating ever reached, by our time control (read once per player).
 * @returns {Promise<Record<string, number>>}
 */
export async function fetchBestRatings(http, id) {
  const history = await http.json(`${API}/user/${enc(id)}/rating-history`);
  const best = {};
  for (const entry of Array.isArray(history) ? history : []) {
    // The names are perf keys ("blitz") on the current API, labels ("Blitz") before.
    const perf = Object.keys(RATED).find(
      (key) => key.toLowerCase() === String(entry.name).toLowerCase().replace(/s$/, ''),
    );
    const points = (entry.points ?? []).map((point) => point[3]).filter(Number.isFinite);
    if (perf && points.length > 0) {
      best[RATED[perf]] = Math.max(...points);
    }
  }
  return best;
}

/** The puzzle of the day. */
export async function fetchDailyPuzzle(http) {
  const daily = await http.json(`${API}/puzzle/daily`);
  const id = daily?.puzzle?.id;
  if (!id) {
    throw new HttpError(502, 'lichess.org: no daily puzzle');
  }
  return {
    platform: 'lichess',
    id: String(id),
    title: null,
    rating: Number.isFinite(daily.puzzle.rating) ? daily.puzzle.rating : null,
    themes: Array.isArray(daily.puzzle.themes) ? daily.puzzle.themes : [],
    url: `https://lichess.org/training/${enc(id)}`,
  };
}

// -----------------------------------------------------------------------------
// Chess.com Published-Data API (https://www.chess.com/news/view/published-data-api),
// read without an account.
//
//   GET /pub/player/{u}                    profile: display name, title (read once)
//   GET /pub/player/{u}/stats              ratings by time class, best ratings
//   GET /pub/player/{u}/games/{YYYY}/{MM}  the games of a month (ETag: 304 most of the time)
//   GET /pub/puzzle                        the puzzle of the day
//
// The PubAPI no longer says whether a player is online (/is-online answers
// 404): Chess.com players have no online feature.
// Month archives are by UTC month, the games in the order they ended.
// -----------------------------------------------------------------------------

import { HttpError } from './http.js';
import { PlayerNotFoundError } from './lichess.js';

const API = 'https://api.chess.com/pub';

/** Stats key -> our time control. */
const RATED = {
  chess_bullet: 'bullet',
  chess_blitz: 'blitz',
  chess_rapid: 'rapid',
  chess_daily: 'daily',
};

/** The results that end a game drawn; "win" wins, every other one loses. */
const DRAWS = new Set([
  'agreed',
  'repetition',
  'stalemate',
  'insufficient',
  '50move',
  'timevsinsufficient',
]);

const enc = encodeURIComponent;

async function json(http, url, id, options) {
  try {
    return await http.json(url, options);
  } catch (err) {
    throw err instanceof HttpError && err.status === 404 && !(err instanceof PlayerNotFoundError)
      ? new PlayerNotFoundError(id)
      : err;
  }
}

/**
 * The profile: the display name (the case of the profile address), the title.
 * @param {ReturnType<import('./http.js').createHttp>} http
 * @param {string} id lowercase username
 */
export async function fetchProfile(http, id) {
  const profile = await json(http, `${API}/player/${enc(id)}`, id);
  const fromUrl = /\/member\/([^/?#]+)$/.exec(String(profile?.url ?? ''))?.[1];
  const name = fromUrl && fromUrl.toLowerCase() === id ? fromUrl : String(profile?.username ?? id);
  return {
    name,
    title: profile?.title ?? null,
    url: `https://www.chess.com/member/${enc(name)}`,
  };
}

/** Ratings by time control, and the best ones Chess.com knows. */
export async function fetchStats(http, id) {
  const stats = await json(http, `${API}/player/${enc(id)}/stats`, id);
  const ratings = {};
  const best = {};
  for (const [key, control] of Object.entries(RATED)) {
    const stat = stats?.[key];
    const rating = stat?.last?.rating;
    if (Number.isFinite(rating)) {
      const record = stat.record ?? {};
      const games = (record.win ?? 0) + (record.loss ?? 0) + (record.draw ?? 0);
      // Chess.com publishes no provisional flag.
      ratings[control] = { rating, games, provisional: false };
    }
    if (Number.isFinite(stat?.best?.rating)) {
      best[control] = stat.best.rating;
    }
  }
  return { ratings, best };
}

/** The UTC month of a time, as the archive path "YYYY/MM". */
export function monthOf(ms) {
  const date = new Date(ms);
  return `${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** The archive URL of a month. */
export const monthUrl = (id, month) => `${API}/player/${enc(id)}/games/${month}`;

/**
 * The games of a UTC month, seen from the player, the newest first. A month
 * without games is an empty list (Chess.com answers 404 for some of them).
 * @param {string} month "YYYY/MM"
 */
export async function fetchMonthGames(http, id, month) {
  let archive;
  try {
    archive = await http.json(monthUrl(id, month), { conditional: true });
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) {
      return [];
    }
    throw err;
  }
  return (Array.isArray(archive?.games) ? archive.games : [])
    .map((game) => toGame(game, id))
    .filter(Boolean)
    .sort((a, b) => b.endedAt - a.endedAt);
}

/**
 * A Chess.com game seen from one of its players.
 * @param {object} game an entry of a month archive
 * @param {string} id lowercase username of the followed player
 */
export function toGame(game, id) {
  if (!game?.url || !game.white || !game.black || !Number.isFinite(game.end_time)) {
    return null;
  }
  const color = String(game.white.username).toLowerCase() === id ? 'white' : 'black';
  const me = game[color];
  const other = game[color === 'white' ? 'black' : 'white'];
  let result = 'loss';
  if (me.result === 'win') {
    result = 'win';
  } else if (DRAWS.has(me.result)) {
    result = 'draw';
  }
  const timeControl = Object.values(RATED).includes(game.time_class) ? game.time_class : 'daily';
  return {
    id: String(game.uuid ?? game.url),
    url: game.url,
    endedAt: game.end_time * 1000,
    result,
    timeControl,
    perf: game.rules && game.rules !== 'chess' ? game.rules : timeControl,
    opponent: String(other.username ?? '?'),
    opponentRating: Number.isFinite(other.rating) ? other.rating : null,
    // A Chess960 game moves the Chess960 rating, not the time control's.
    rating:
      Number.isFinite(me.rating) && (!game.rules || game.rules === 'chess') ? me.rating : null,
    // Chess.com does not give the rating change of a game.
    ratingDiff: null,
    rated: game.rated === true,
  };
}

/** The puzzle of the day. */
export async function fetchDailyPuzzle(http) {
  const puzzle = await http.json(`${API}/puzzle`);
  if (!puzzle?.url) {
    throw new HttpError(502, 'api.chess.com: no daily puzzle');
  }
  return {
    platform: 'chesscom',
    id: String(puzzle.publish_time ?? puzzle.url),
    title: puzzle.title ? String(puzzle.title) : null,
    rating: null,
    themes: [],
    url: String(puzzle.url),
  };
}

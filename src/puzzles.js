// -----------------------------------------------------------------------------
// The puzzles of the day, read on demand (widget, scene action) and kept for
// an hour: both sites publish one a day.
// -----------------------------------------------------------------------------

import * as lichess from './lichess.js';
import * as chesscom from './chesscom.js';

const TTL_MS = 60 * 60 * 1000;

/** The page of the puzzle of the day, when the puzzle itself cannot be read. */
export const PUZZLE_PAGES = {
  lichess: 'https://lichess.org/training/daily',
  chesscom: 'https://www.chess.com/daily-chess-puzzle',
};

/**
 * @param {ReturnType<import('./http.js').createHttp>} http
 * @param {() => number} [now]
 */
export function createPuzzles(http, now = () => Date.now()) {
  const cache = new Map();
  const fetchers = { lichess: lichess.fetchDailyPuzzle, chesscom: chesscom.fetchDailyPuzzle };

  return {
    /**
     * The puzzle of the day of a platform.
     * @param {'lichess' | 'chesscom'} platform
     */
    async get(platform) {
      const cached = cache.get(platform);
      if (cached && now() - cached.at < TTL_MS) {
        return cached.puzzle;
      }
      const puzzle = await fetchers[platform](http);
      cache.set(platform, { puzzle, at: now() });
      return puzzle;
    },

    /** The cached puzzle, even an old one, or undefined. */
    peek: (platform) => cache.get(platform)?.puzzle,
  };
}

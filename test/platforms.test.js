// -----------------------------------------------------------------------------
// The two API clients on the recorded answers: games seen from the followed
// player, results, ratings, records.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as lichess from '../src/lichess.js';
import * as chesscom from '../src/chesscom.js';
import { createHttp } from '../src/http.js';
import { createNetwork, fixture, lichessGames } from './helpers/network.js';

test('a Lichess game, seen from either side; aborted games are not games', () => {
  const [lost, aiGame] = lichessGames('thibault');
  assert.deepEqual(lichess.toGame(lost, 'thibault'), {
    id: 'PndlSDZg',
    url: 'https://lichess.org/PndlSDZg',
    endedAt: 1791814483311,
    result: 'loss',
    timeControl: 'blitz',
    perf: 'blitz',
    opponent: 'Pehachzed',
    opponentRating: 1800,
    rating: 1744,
    ratingDiff: -5,
    rated: true,
  });
  const ai = lichess.toGame(aiGame, 'thibault');
  assert.equal(ai.opponent, 'Stockfish 3');
  assert.equal(ai.result, 'loss');
  assert.equal(ai.timeControl, 'classical');
  const won = lichess.toGame(lichessGames('drnykterstein')[0], 'drnykterstein');
  assert.equal(won.result, 'win');
  assert.equal(won.opponent, 'Night-King96');
  assert.equal(lichess.toGame({ ...lost, status: 'aborted' }, 'thibault'), null);
  assert.equal(lichess.toGame({ ...lost, speed: 'ultraBullet' }, 'thibault').perf, 'ultraBullet');
  const atomic = lichess.toGame({ ...lost, variant: 'atomic' }, 'thibault');
  assert.equal(atomic.perf, 'atomic');
  // A variant moves the variant's rating: none is given for the time control.
  assert.equal(atomic.rating, null);
  assert.equal(atomic.ratingDiff, null);
});

test('Lichess ratings: only the time controls played; the best from the history', async () => {
  const network = createNetwork({ lichess: ['thibault', 'drnykterstein'] });
  const http = createHttp({ fetch: network.fetch });
  const user = await lichess.fetchUser(http, 'drnykterstein');
  assert.equal(user.name, 'DrNykterstein');
  assert.equal(user.title, 'GM');
  // Correspondence 1500 with no game is Lichess's default, not a rating.
  assert.equal(user.ratings.daily, undefined);
  assert.equal(user.ratings.bullet.rating, 3263);
  assert.deepEqual(await lichess.fetchBestRatings(http, 'thibault'), {
    bullet: 1941,
    blitz: 1970,
    rapid: 1992,
    classical: 1863,
    daily: 1972,
    puzzle: 2163,
  });
  // Magnus Carlsen's history is empty (hidden): no best, the current rating seeds it.
  assert.deepEqual(await lichess.fetchBestRatings(http, 'drnykterstein'), {});
  await assert.rejects(lichess.fetchUser(http, 'nobody'), lichess.PlayerNotFoundError);
  await assert.rejects(
    lichess.fetchUser(
      createHttp({ fetch: async () => Response.json({ id: 'x', disabled: true }) }),
      'x',
    ),
    lichess.PlayerNotFoundError,
  );
});

test('a Chess.com game: win, draws by agreement or repetition, every other end loses', () => {
  const games = fixture('chesscom/games-erik-2026-10.json').games;
  const results = games.map((game) => chesscom.toGame(game, 'erik').result);
  assert.deepEqual(results, ['loss', 'win', 'loss', 'win', 'loss', 'loss', 'win', 'win']);
  const base = games[0];
  for (const [code, result] of [
    ['agreed', 'draw'],
    ['repetition', 'draw'],
    ['stalemate', 'draw'],
    ['timevsinsufficient', 'draw'],
    ['checkmated', 'loss'],
    ['abandoned', 'loss'],
  ]) {
    const game = { ...base, white: { ...base.white, username: 'erik', result: code } };
    assert.equal(chesscom.toGame(game, 'erik').result, result, code);
  }
  assert.equal(chesscom.toGame(games[0], 'erik').timeControl, 'daily');
  assert.equal(chesscom.toGame({ ...base, rules: 'chess960' }, 'erik').perf, 'chess960');
  assert.equal(chesscom.toGame({ ...base, rules: 'chess960' }, 'erik').rating, null);
});

test('Chess.com stats, profile name and months', async () => {
  const network = createNetwork({ chesscom: ['hikaru', 'erik'] });
  const http = createHttp({ fetch: network.fetch });
  const { ratings, best } = await chesscom.fetchStats(http, 'hikaru');
  assert.deepEqual(Object.keys(ratings), ['bullet', 'blitz', 'rapid', 'daily']);
  assert.equal(best.bullet, 3570);
  assert.equal((await chesscom.fetchProfile(http, 'hikaru')).name, 'Hikaru');
  assert.equal(chesscom.monthOf(Date.parse('2026-10-31T23:30:00Z')), '2026/10');
  assert.equal(chesscom.monthOf(Date.parse('2026-11-01T00:30:00Z')), '2026/11');
  assert.deepEqual(await chesscom.fetchMonthGames(http, 'hikaru', '2026/09'), []);
  await assert.rejects(chesscom.fetchStats(http, 'nobody'), lichess.PlayerNotFoundError);
});

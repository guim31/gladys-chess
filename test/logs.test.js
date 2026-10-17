// -----------------------------------------------------------------------------
// Quiet logs: a normal cycle writes nothing at the info level, and a failure
// that lasts writes one line when it starts and one when it ends.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAll, createWorld } from './helpers/world.js';
import { lichessGame } from './helpers/network.js';

/** Capture the log lines (the SDK logger writes through console) at a level. */
function capture(t, level) {
  const previous = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = level;
  t.after(() => {
    process.env.LOG_LEVEL = previous;
  });
  const lines = [];
  for (const stream of ['log', 'error']) {
    t.mock.method(console, stream, (...args) => lines.push(args.join(' ')));
  }
  return lines;
}

const strip = (lines) => lines.map((line) => line.replace(/^\[[^\]]+\] \[(\w+)\] \[\w+\] /, '$1 '));

test('a normal cycle writes nothing at the info level', async (t) => {
  const lines = capture(t, 'info');
  const w = await createWorld({ lichess: ['thibault'], chesscom: ['hikaru'] });
  await createAll(w);
  // Start-up says what it follows and what it found: lifecycle.
  assert.ok(
    lines.some((line) => line.includes('[INFO]') && line.includes('Hikaru (Chess.com) found')),
  );
  const before = lines.length;
  for (let i = 0; i < 12; i += 1) {
    w.advance(5 * 60_000);
    await w.app.poller.cycle();
    await w.gladys.fake.widgetGet('chess_players', { language: 'fr' });
    await w.gladys.fake.poll(w.gladys.fake.discoveredDevices[0]);
  }
  assert.deepEqual(lines.slice(before), []);
});

test('a lasting failure: one line when it starts, one when it ends', async (t) => {
  const lines = capture(t, 'info');
  const w = await createWorld({ chesscom: ['hikaru'] });
  await createAll(w);
  const before = lines.length;
  w.network.state.down['api.chess.com'] = { status: 503 };
  for (let i = 0; i < 6; i += 1) {
    w.advance(5 * 60_000);
    await w.app.poller.cycle();
  }
  delete w.network.state.down['api.chess.com'];
  w.advance(5 * 60_000);
  await w.app.poller.cycle();
  assert.deepEqual(strip(lines.slice(before)), [
    'WARN Chess.com player hikaru: api.chess.com: HTTP 503',
    'INFO Chess.com player hikaru read again',
  ]);
});

test('a game finished: one info line, when its scene event is fired', async (t) => {
  const lines = capture(t, 'info');
  const w = await createWorld({ lichess: ['thibault'] });
  await createAll(w);
  const before = lines.length;
  w.advance(5 * 60_000);
  w.network.state.games.thibault.unshift(
    lichessGame('thibault', { gameId: 'G1', endedAt: w.clock.now - 60_000, winner: null }),
  );
  await w.app.poller.cycle();
  assert.deepEqual(strip(lines.slice(before)), [
    'INFO thibault (Lichess): draw against Opponent42',
  ]);
});

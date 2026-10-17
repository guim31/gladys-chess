// -----------------------------------------------------------------------------
// The integration end to end, against the SDK's fake Gladys and the recorded
// answers of Lichess and Chess.com: discovery, states, games, records,
// online, errors, the container's own timer.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { START, createAll, createWorld, idsOf, lastState } from './helpers/world.js';
import { chesscomGame, lichessGame } from './helpers/network.js';
import { MemoryStore } from '../src/store.js';

const MINUTE = 60_000;

test('one device per configured player, read from the real answers', async () => {
  const w = await createWorld({ lichess: ['thibault'], chesscom: ['hikaru'] });
  const devices = w.gladys.fake.discoveredDevices;
  assert.deepEqual(
    devices.map((d) => [d.name, d.external_id]),
    [
      ['thibault (Lichess)', idsOf(w.gladys, 'lichess', 'thibault').device],
      ['Hikaru (Chess.com)', idsOf(w.gladys, 'chesscom', 'hikaru').device],
    ],
  );
  assert.equal(w.gladys.fake.connectionStatus.connected, true);
  // Nothing is published before the user adds the devices.
  assert.equal(w.gladys.fake.states.length, 0);
});

test('a device added gets every state at once', async () => {
  const w = await createWorld({ lichess: ['thibault'], chesscom: ['hikaru'] });
  await createAll(w);
  const g = w.gladys;
  assert.equal(lastState(g, 'lichess', 'thibault', 'rating_blitz'), 1744);
  assert.equal(lastState(g, 'lichess', 'thibault', 'rating_bullet'), 1774);
  assert.equal(lastState(g, 'lichess', 'thibault', 'rating_puzzle'), 1937);
  assert.equal(lastState(g, 'lichess', 'thibault', 'online'), 0);
  assert.equal(lastState(g, 'lichess', 'thibault', 'playing'), 0);
  // The last game of the fixture: lost with white against Pehachzed, 1749 − 5.
  assert.equal(
    lastState(g, 'lichess', 'thibault', 'last_game'),
    'Défaite contre Pehachzed (blitz, 1744 −5)',
  );
  assert.equal(lastState(g, 'lichess', 'thibault', 'games_today'), 0);
  // Hikaru played 12 bullet games this evening, 7 won.
  assert.equal(lastState(g, 'chesscom', 'hikaru', 'rating_bullet'), 3420);
  assert.equal(lastState(g, 'chesscom', 'hikaru', 'rating_blitz'), 3465);
  assert.equal(lastState(g, 'chesscom', 'hikaru', 'games_today'), 12);
  assert.equal(lastState(g, 'chesscom', 'hikaru', 'wins_today'), 7);
  assert.match(
    lastState(g, 'chesscom', 'hikaru', 'last_game'),
    /^Défaite contre \S+ \(bullet, 3420\)$/,
  );
  assert.ok(g.fake.widgetRefreshes.includes('chess_players'));
  // No event for the games played before the player was followed.
  assert.deepEqual(g.fake.sceneEvents, []);
});

test('a new Lichess game fires "Game finished" with its result and rating change', async () => {
  const w = await createWorld({ lichess: ['thibault'] });
  await createAll(w);
  w.advance(5 * MINUTE);
  w.network.state.games.thibault.unshift(
    lichessGame('thibault', { gameId: 'NewGame1', endedAt: w.clock.now - MINUTE, diff: 6 }),
  );
  w.network.state.users.thibault.perfs.blitz.rating = 1750;
  await w.app.poller.cycle();
  const events = w.gladys.fake.sceneEvents;
  assert.equal(events.length, 1);
  assert.equal(events[0].key, 'game_finished');
  assert.deepEqual(events[0].data, {
    device: idsOf(w.gladys, 'lichess', 'thibault').device,
    player_name: 'thibault (Lichess)',
    result: 'win',
    time_control: 'blitz',
    result_text: 'Victoire',
    opponent: 'Opponent42',
    url: 'https://lichess.org/NewGame1',
    summary: 'thibault (Lichess): Victoire contre Opponent42 (blitz, 1756 +6)',
    rating: 1756,
    rating_diff: 6,
    opponent_rating: 1760,
  });
  assert.equal(lastState(w.gladys, 'lichess', 'thibault', 'games_today'), 1);
  assert.equal(lastState(w.gladys, 'lichess', 'thibault', 'wins_today'), 1);
  assert.equal(lastState(w.gladys, 'lichess', 'thibault', 'rating_blitz'), 1750);
  // The same game is never fired twice.
  w.advance(5 * MINUTE);
  await w.app.poller.cycle();
  assert.equal(w.gladys.fake.sceneEvents.length, 1);
});

test('a burst of games fires the last five only, in order', async () => {
  const w = await createWorld({ chesscom: ['hikaru'] });
  await createAll(w);
  w.advance(30 * MINUTE);
  for (let i = 0; i < 8; i += 1) {
    w.network.state.archives['hikaru/2026/10'].push(
      chesscomGame('Hikaru', {
        endedAt: START + (i + 1) * MINUTE,
        result: i % 2 ? 'win' : 'agreed',
      }),
    );
  }
  await w.app.poller.cycle();
  const events = w.gladys.fake.sceneEvents;
  assert.deepEqual(
    events.map((e) => e.data.result),
    ['win', 'draw', 'win', 'draw', 'win'],
  );
  assert.ok(events.every((e) => e.data.rating_diff === undefined));
  assert.equal(lastState(w.gladys, 'chesscom', 'hikaru', 'games_today'), 20);
});

test('a rating above the best ever fires "New rating record", a provisional one never', async () => {
  const w = await createWorld({ lichess: ['thibault'] });
  await createAll(w);
  // Seeded from the rating history: blitz 1970, classical 1863 (provisional).
  assert.equal(w.players.records.get('lichess:thibault').best.blitz, 1970);
  w.advance(5 * MINUTE);
  w.network.state.users.thibault.perfs.blitz.rating = 1975;
  w.network.state.users.thibault.perfs.classical.rating = 1990;
  await w.app.poller.cycle();
  const events = w.gladys.fake.sceneEvents.filter((e) => e.key === 'rating_record');
  assert.equal(events.length, 1);
  assert.equal(events[0].data.time_control, 'blitz');
  assert.equal(events[0].data.rating, 1975);
  assert.equal(events[0].data.previous_best, 1970);
  assert.equal(
    events[0].data.summary,
    'thibault (Lichess) : nouveau record en blitz, 1975 (précédent 1970)',
  );
  // Equal or lower: nothing more.
  w.advance(5 * MINUTE);
  await w.app.poller.cycle();
  assert.equal(w.gladys.fake.sceneEvents.length, 1);
});

test('Chess.com records start from the best rating Chess.com knows', async () => {
  const w = await createWorld({ chesscom: ['hikaru'] });
  await createAll(w);
  assert.equal(w.players.records.get('chesscom:hikaru').best.blitz, 3503);
  w.advance(5 * MINUTE);
  w.network.state.stats.hikaru.chess_blitz.last.rating = 3503;
  await w.app.poller.cycle();
  assert.deepEqual(w.gladys.fake.sceneEvents, []);
  w.advance(5 * MINUTE);
  w.network.state.stats.hikaru.chess_blitz.last.rating = 3510;
  await w.app.poller.cycle();
  assert.equal(w.gladys.fake.sceneEvents.length, 1);
  assert.equal(w.gladys.fake.sceneEvents[0].data.previous_best, 3503);
});

test('online and playing follow the Lichess statuses, one request for all players', async () => {
  const w = await createWorld({ lichess: ['thibault', 'drnykterstein'] });
  await createAll(w);
  w.advance(5 * MINUTE);
  w.network.state.statuses.thibault = { online: true, playing: true };
  const before = w.network.count('/users/status');
  await w.app.poller.cycle();
  assert.equal(w.network.count('/users/status') - before, 1);
  assert.equal(lastState(w.gladys, 'lichess', 'thibault', 'online'), 1);
  assert.equal(lastState(w.gladys, 'lichess', 'thibault', 'playing'), 1);
  assert.equal(lastState(w.gladys, 'lichess', 'drnykterstein', 'online'), 0);
});

test('the counters of the day go back to zero after local midnight', async () => {
  const w = await createWorld({ chesscom: ['hikaru'] });
  await createAll(w);
  assert.equal(lastState(w.gladys, 'chesscom', 'hikaru', 'games_today'), 12);
  // 22:05 UTC is 00:05 in Paris.
  w.advance(4 * 60 * MINUTE);
  await w.app.poller.cycle();
  assert.equal(lastState(w.gladys, 'chesscom', 'hikaru', 'games_today'), 0);
  assert.equal(lastState(w.gladys, 'chesscom', 'hikaru', 'wins_today'), 0);
});

test('a Chess.com month already read answers 304: no new download', async () => {
  const w = await createWorld({ chesscom: ['hikaru'] });
  await createAll(w);
  w.advance(5 * MINUTE);
  await w.app.poller.cycle();
  const archive = w.network.calls.filter((c) => c.url.endsWith('/games/2026/10'));
  assert.ok(archive.length >= 2);
  assert.ok(archive.at(-1).headers['if-none-match']);
  assert.equal(lastState(w.gladys, 'chesscom', 'hikaru', 'games_today'), 12);
  // Every request says who is calling (asked by Chess.com).
  assert.ok(w.network.calls.every((c) => /gladys-chess/.test(c.headers['user-agent'])));
});

test('an unknown username: the device is not created, the check action says it', async () => {
  const w = await createWorld({
    config: { lichess_players: 'thibault, no-such-player-zz', chesscom_players: 'bad/name!' },
    lichess: ['thibault'],
  });
  assert.equal(w.gladys.fake.discoveredDevices.length, 1);
  const ack = await w.gladys.fake.action('check_players');
  assert.equal(ack.success, true);
  assert.equal(
    ack.data.message.en,
    [
      'thibault (Lichess): blitz 1744, bullet 1774, puzzles 1937, rapid 1802, correspondence 1942, classical 1858',
      'no-such-player-zz (Lichess): no such player',
      'Not a username, ignored: bad/name!',
    ].join('\n'),
  );
});

test('Lichess answering 429: a minute of silence, then reads again', async () => {
  const w = await createWorld({ lichess: ['thibault'] });
  await createAll(w);
  w.network.state.down['lichess.org'] = { status: 429 };
  w.advance(5 * MINUTE);
  await w.app.poller.cycle();
  const afterLimit = w.network.count('lichess.org');
  // The status request got the 429: the player itself is not even asked.
  w.advance(5 * MINUTE);
  delete w.network.state.down['lichess.org'];
  await w.app.poller.cycle();
  assert.ok(w.network.count('lichess.org') > afterLimit);
  assert.equal(w.gladys.fake.connectionStatus.connected, true);
});

test('both sites down: the status says so, and comes back', async () => {
  const w = await createWorld({ lichess: ['thibault'], chesscom: ['hikaru'] });
  await createAll(w);
  w.network.state.down['lichess.org'] = { status: 503 };
  w.network.state.down['api.chess.com'] = new TypeError('fetch failed');
  w.advance(5 * MINUTE);
  await w.app.poller.cycle();
  assert.equal(w.gladys.fake.connectionStatus.connected, false);
  w.network.state.down = {};
  w.advance(5 * MINUTE);
  await w.app.poller.cycle();
  assert.equal(w.gladys.fake.connectionStatus.connected, true);
});

test('the players and their last game survive a restart: no old game fires again', async () => {
  const store = new MemoryStore();
  const w = await createWorld({ lichess: ['thibault'], store });
  await createAll(w);
  const devices = w.gladys.fake.discoveredDevices;
  const again = await createWorld({ lichess: ['thibault'], store, devices });
  assert.equal(again.players.records.get('lichess:thibault').best.blitz, 1970);
  assert.deepEqual(again.gladys.fake.sceneEvents, []);
  // The rating history is read once per player, not at every start.
  assert.equal(again.network.count('rating-history'), 0);
});

test('the container reads the players by itself, without the core polling', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: START });
  const w = await createWorld({ lichess: ['thibault'], timers: true });
  await createAll(w);
  const before = w.network.count('/api/user/thibault');
  for (let i = 0; i < 5; i += 1) {
    t.mock.timers.tick(MINUTE);
    await new Promise((resolve) => setImmediate(resolve));
    await w.app.poller.cycle();
  }
  assert.ok(w.network.count('/api/user/thibault') > before);
  await w.app.stop();
});

test('the core poll is skipped while the timer reads', async () => {
  const w = await createWorld({ lichess: ['thibault'] });
  await createAll(w);
  const before = w.network.count('/api/user/thibault');
  await w.gladys.fake.poll(w.gladys.fake.discoveredDevices[0]);
  assert.equal(w.network.count('/api/user/thibault'), before);
});

test('a player removed from the configuration is forgotten', async () => {
  const w = await createWorld({ lichess: ['thibault'], chesscom: ['hikaru'] });
  await w.gladys.fake.configUpdated({ lichess_players: '', chesscom_players: 'hikaru' });
  assert.deepEqual(
    w.gladys.fake.discoveredDevices.map((d) => d.name),
    ['Hikaru (Chess.com)'],
  );
  assert.equal(w.players.records.has('lichess:thibault'), false);
});

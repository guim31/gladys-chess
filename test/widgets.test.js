// -----------------------------------------------------------------------------
// The "Chess players" widget and the scene actions, on the recorded answers.
// Every content is checked against the core vocabulary and budget
// (validateWidgetContent), and every bound feature against the device.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { createAll, createWorld, idsOf } from './helpers/world.js';

async function content(w, settings, language = 'fr') {
  const ack = await w.gladys.fake.widgetGet('chess_players', { settings, language });
  assert.equal(ack.success, true, JSON.stringify(ack));
  const value = ack.data.content;
  assert.deepEqual(validateWidgetContent(value), []);
  return value;
}

test('one player: live rating tiles, last game, today, status and links', async () => {
  const w = await createWorld({ lichess: ['thibault'] });
  await createAll(w);
  const device = idsOf(w.gladys, 'lichess', 'thibault');
  const { components } = await content(w, { player: device.device });
  const tiles = components.filter((c) => c.type === 'value');
  assert.deepEqual(
    tiles.map((t) => t.device_feature),
    ['rating_blitz', 'rating_bullet', 'rating_puzzle', 'rating_rapid'].map(device.feature),
  );
  // Every bound feature exists on the device.
  const features = w.gladys.fake.discoveredDevices[0].features.map((f) => f.external_id);
  assert.ok(tiles.every((t) => features.includes(t.device_feature)));
  const status = components.find((c) => c.type === 'status');
  assert.deepEqual(
    status.items.map((i) => [i.label, i.value]),
    [
      ['Dernière partie', 'Défaite contre Pehachzed'],
      ["Aujourd'hui", '0 partie'],
      ['État', 'Hors ligne'],
    ],
  );
  const links = components.filter((c) => c.type === 'button').map((c) => c.link.url);
  assert.deepEqual(links, [
    'https://lichess.org/@/thibault',
    'https://lichess.org/PndlSDZg',
    'https://lichess.org/training/iUIdn',
  ]);
});

test('the overview: one row per added player, the puzzles of the followed sites', async () => {
  const w = await createWorld({ lichess: ['thibault'], chesscom: ['hikaru'] });
  const empty = await content(w, {}, 'en');
  assert.equal(empty.components[0].type, 'text');
  await createAll(w);
  w.network.state.statuses.thibault = { online: true };
  w.advance(5 * 60_000);
  await w.app.poller.cycle();
  const { components } = await content(w, {}, 'de');
  const rows = components.find((c) => c.type === 'status').items;
  assert.deepEqual(
    rows.map((r) => [r.label, r.value, r.color]),
    [
      ['thibault (Lichess)', 'Blitz 1744', 'success'],
      ['Hikaru (Chess.com)', 'Blitz 3465', 'neutral'],
    ],
  );
  assert.deepEqual(
    components.filter((c) => c.type === 'button').map((c) => [c.label, c.link.url]),
    [
      ['Lichess-Puzzle', 'https://lichess.org/training/iUIdn'],
      ['Chess.com-Puzzle', 'https://www.chess.com/daily/2026-10-17'],
    ],
  );
});

test('a puzzle that cannot be read: the button opens the puzzle page', async () => {
  const w = await createWorld({ chesscom: ['hikaru'] });
  w.network.state.down['api.chess.com'] = { status: 503 };
  const { components } = await content(w, {}, 'es');
  const button = components.find((c) => c.type === 'button');
  assert.equal(button.link.url, 'https://www.chess.com/daily-chess-puzzle');
});

test('a player no longer followed: a plain text', async () => {
  const w = await createWorld({ lichess: ['thibault'] });
  const { components } = await content(w, { player: 'ext:gone:lichess:nobody' }, 'en');
  assert.deepEqual(components, [
    {
      type: 'text',
      text: 'This player is no longer followed: check the configuration of the integration.',
    },
  ]);
});

test('scene action "Get a chess player": a sentence and the values', async () => {
  const w = await createWorld({ chesscom: ['hikaru'], config: { language: 'en' } });
  await createAll(w);
  const ack = await w.gladys.fake.sceneAction('get_player', {
    player: idsOf(w.gladys, 'chesscom', 'hikaru').device,
  });
  assert.equal(ack.success, true);
  const outputs = ack.data.outputs;
  assert.equal(outputs.rating_blitz, 3465);
  assert.equal(outputs.rating_bullet, 3420);
  assert.equal(outputs.games_today, 12);
  assert.equal(outputs.wins_today, 7);
  assert.equal(outputs.last_result, 'loss');
  assert.equal(outputs.online, undefined);
  assert.match(
    outputs.summary,
    /^Hikaru \(Chess\.com\): blitz 3465, bullet 3420, rapid 2838\. Today: 12 games: \+7 =0 −5\. Last game: Loss vs \S+ \(bullet, 3420\)\.$/,
  );
  const unknown = await w.gladys.fake.sceneAction('get_player', { player: 'nope' });
  assert.equal(unknown.success, false);
});

test('scene action "Get the puzzle of the day": Lichess by default', async () => {
  const w = await createWorld({ config: { language: 'fr' } });
  const lichess = await w.gladys.fake.sceneAction('get_daily_puzzle', {});
  assert.deepEqual(lichess.data.outputs, {
    url: 'https://lichess.org/training/iUIdn',
    message: 'Problème du jour Lichess (2108) : https://lichess.org/training/iUIdn'.replace(
      ' : ',
      ': ',
    ),
    rating: 2108,
  });
  const chesscom = await w.gladys.fake.sceneAction('get_daily_puzzle', { platform: 'chesscom' });
  assert.equal(chesscom.data.outputs.title, 'Crash! Bang! gg');
  // An hour of cache: asked again, no new request.
  const before = w.network.count('/pub/puzzle');
  await w.gladys.fake.sceneAction('get_daily_puzzle', { platform: 'chesscom' });
  assert.equal(w.network.count('/pub/puzzle'), before);
});

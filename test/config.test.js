import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig, parsePlayers } from '../src/config.js';

test('usernames: separators, profile links, case and duplicates', () => {
  assert.deepEqual(
    parsePlayers(
      'lichess',
      'thibault; DrNykterstein\nhttps://lichess.org/@/Zhigalko_Sergei/all  THIBAULT @lance5500',
    ),
    { valid: ['thibault', 'DrNykterstein', 'Zhigalko_Sergei', 'lance5500'], invalid: [] },
  );
  assert.deepEqual(parsePlayers('chesscom', 'https://www.chess.com/member/Hikaru, x, é'), {
    valid: ['Hikaru'],
    invalid: ['x', 'é'],
  });
});

test('the configuration: players by platform, ten at most, defaults', () => {
  const many = Array.from({ length: 12 }, (_, i) => `player${i}`).join(',');
  const config = normalizeConfig({ lichess_players: many, chesscom_players: 'Hikaru' });
  assert.equal(config.players.length, 11);
  assert.deepEqual(config.players.at(-1), { platform: 'chesscom', id: 'hikaru', name: 'Hikaru' });
  assert.deepEqual(config.droppedPlayers, ['player10', 'player11']);
  assert.equal(config.refreshMinutes, 5);
  assert.equal(config.language, 'fr');
  assert.equal(normalizeConfig({ refresh_minutes: '1', language: 'it' }).refreshMinutes, 5);
  assert.equal(normalizeConfig({ refresh_minutes: '30' }).refreshMinutes, 30);
});

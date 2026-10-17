// -----------------------------------------------------------------------------
// A complete test world: the SDK's fake Gladys, a simulated network, a store
// in memory, a clock, and the integration wired on top (registerHandlers).
// -----------------------------------------------------------------------------

import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { registerHandlers } from '../../src/app.js';
import { MemoryStore } from '../../src/store.js';
import { createNetwork } from './network.js';

// "Today" is a local day: the tests run in the time zone of the fixtures.
process.env.TZ = 'Europe/Paris';
// The integration logs its lifecycle; keep the test output readable
// (LOG_LEVEL is read on every log call). LOG_LEVEL=debug npm test shows them.
process.env.LOG_LEVEL ??= 'silent';

/** The test clock starts here: the evening the fixtures were recorded. */
export const START = Date.parse('2026-10-17T18:05:00Z');

/**
 * @param {object} [options]
 * @param {string[]} [options.lichess] Lichess fixture players, configured
 * @param {string[]} [options.chesscom] Chess.com fixture players, configured
 * @param {object} [options.config] raw integration config, over the players
 * @param {Array} [options.devices] devices already created in Gladys
 * @param {object} [options.store]
 * @param {boolean} [options.connect]
 * @param {boolean} [options.timers] run the polling timer, on Date.now
 */
export async function createWorld({
  lichess = [],
  chesscom = [],
  config = {},
  devices = [],
  store = new MemoryStore(),
  connect = true,
  timers = false,
} = {}) {
  const clock = { now: START };
  const now = timers ? () => Date.now() : () => clock.now;
  const network = createNetwork({ lichess, chesscom });
  const fullConfig = {
    lichess_players: lichess.join(','),
    chesscom_players: chesscom.join(','),
    ...config,
  };
  const gladys = createFakeGladys({ config: fullConfig, devices });
  const app = registerHandlers(gladys, { store, fetch: network.fetch, timers, now });
  if (connect) {
    await gladys.connect();
  }
  return {
    gladys,
    app,
    network,
    store,
    clock,
    players: app.players,
    /** Move the clock forward. */
    advance(ms) {
      clock.now += ms;
    },
  };
}

/** Add every discovered device to Gladys, as the user would. */
export async function createAll(world) {
  for (const device of world.gladys.fake.discoveredDevices) {
    await world.gladys.fake.deviceCreated(device);
  }
}

/** The external ids of a player. */
export const idsOf = (gladys, platform, id) => gladys.externalIds(platform, id);

/** The last state published on a feature of a player, or undefined. */
export const lastState = (gladys, platform, id, key) =>
  gladys.fake.lastState(idsOf(gladys, platform, id).feature(key));

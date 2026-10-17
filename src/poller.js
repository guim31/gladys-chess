// -----------------------------------------------------------------------------
// The container's own polling timer.
//
// The devices are published with `should_poll: true` and a valid
// `poll_frequency`, but the core cannot be trusted to call onPoll: Gladys
// 5.2.x skips devices created without `should_poll`, and a device keeps the
// polling fields it was created with (GladysAssistant/Gladys#3198). So the
// container reads the players by itself, and the core's onPoll is a fallback.
//
// Pace: every `refresh_minutes`. One timer ticks every minute and reads the
// players that are due; a player read less than 90 % of the period ago is
// skipped, whoever asks (timer or core), so the core's minute polls never add
// a request while the timer runs.
//
// What is read: the players whose device the user added to Gladys, and the
// players never read yet (their first answer gives the device for the
// Discovery tab). One read at a time: cycles never overlap.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { playerKey, refreshPeriodMs } from './config.js';

const logger = createLogger({ name: 'poller' });

/** The timer's tick. */
export const TICK_MS = 60_000;

/** A player read less than this share of the period ago is not read again. */
const MIN_GAP = 0.9;

/**
 * @param {object} options
 * @param {object} options.gladys
 * @param {import('./players.js').Players} options.players
 * @param {() => object} options.getConfig
 * @param {() => Promise<void>} options.afterCycle publishes what the reads changed
 * @param {boolean} [options.timers] run the periodic timer (tests may turn it off)
 * @param {() => number} [options.now]
 */
export function createPoller({
  gladys,
  players,
  getConfig,
  afterCycle = async () => {},
  timers = true,
  now = () => Date.now(),
}) {
  /** When each player was last read, by key. */
  const lastReadAt = new Map();
  let queue = Promise.resolve();
  let timer = null;
  let stopped = true;

  /** The players to follow: added to Gladys, or never read. */
  function wanted(config) {
    return players.players(config).filter((player) => {
      const record = players.records.get(playerKey(player));
      return !record || players.isCreated(record);
    });
  }

  /**
   * One cycle, queued behind the running one.
   * @param {{ keys?: string[], maxAgeMs?: number }} [options] keys: these
   *   players only (else the wanted ones); maxAgeMs: read a player last read
   *   that long ago (else 90 % of the period)
   */
  function cycle({ keys, maxAgeMs } = {}) {
    const run = queue.then(async () => {
      if (gladys.connected === false) {
        logger.debug('Gladys unreachable: cycle skipped');
        return;
      }
      const config = getConfig();
      const gap = maxAgeMs ?? refreshPeriodMs(config) * MIN_GAP;
      const candidates = keys
        ? players.players(config).filter((player) => keys.includes(playerKey(player)))
        : wanted(config);
      const due = candidates.filter((player) => {
        const last = lastReadAt.get(playerKey(player));
        return last === undefined || now() - last >= gap;
      });
      if (due.length === 0) {
        return;
      }
      for (const player of due) {
        lastReadAt.set(playerKey(player), now());
      }
      await players.refreshPlayers(due);
      await afterCycle();
    });
    queue = run.catch(() => {});
    return run;
  }

  function schedule() {
    clearTimeout(timer);
    timer = null;
    if (!timers || stopped) {
      return;
    }
    timer = setTimeout(async () => {
      timer = null;
      try {
        await cycle();
      } catch (err) {
        logger.error(`Polling cycle failed (${err.message})`);
      } finally {
        schedule();
      }
    }, TICK_MS);
  }

  return {
    /** (Re)start: read every wanted player now, then on the timer. */
    async restart() {
      stopped = false;
      schedule();
      await cycle({ maxAgeMs: 0 });
    },

    /** One timer cycle (tests). */
    cycle,

    /**
     * The core's onPoll (fallback): read the device's player unless it was
     * read recently.
     * @param {{ external_id: string }} device
     */
    async pollFromCore(device) {
      const record = players.recordByDevice(device.external_id);
      if (!record) {
        logger.debug(`onPoll ignored (not a followed player): ${device.external_id}`);
        return;
      }
      await cycle({ keys: [playerKey(record)] });
    },

    /** Read some players now, unless they were read less than `maxAgeMs` ago. */
    refreshNow(keys, { maxAgeMs = 0 } = {}) {
      return cycle({ keys, maxAgeMs });
    },

    stop() {
      stopped = true;
      clearTimeout(timer);
      timer = null;
    },
  };
}

// -----------------------------------------------------------------------------
// The integration, wired on a Gladys client: the real one (index.js) or the
// SDK's fake Gladys (tests). Every handler is registered here, before
// connect().
//
//   connected       -> config, players known from /data, then a first read
//   poller          -> reads the players on its own timer (src/poller.js)
//   onPoll          -> fallback of the timer
//   onDeviceCreated -> the states of the new device, now
//   action          -> check_players (src/actions.js)
//   scene actions   -> get_player, get_daily_puzzle (src/scenes.js)
//   scene triggers  -> game_finished, rating_record (src/players.js)
//   widget          -> chess_players (src/widgets.js)
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { normalizeConfig, playerKey } from './config.js';
import { createHttp } from './http.js';
import { Players } from './players.js';
import { Store } from './store.js';
import { createPoller } from './poller.js';
import { createPuzzles } from './puzzles.js';
import { ACTION, checkPlayers } from './actions.js';
import { SCENE_ACTION, getDailyPuzzle, getPlayer } from './scenes.js';
import { WIDGET_KEY, buildContent } from './widgets.js';
import { TEXT } from './i18n.js';

const logger = createLogger({ name: 'chess' });

/**
 * @param {object} gladys GladysIntegration, or the SDK's fake Gladys
 * @param {object} [options]
 * @param {{ load: Function, save: Function, flush?: Function }} [options.store]
 * @param {typeof fetch} [options.fetch]
 * @param {boolean} [options.timers] run the polling timer
 * @param {() => number} [options.now]
 */
export function registerHandlers(gladys, { store = new Store(), fetch, timers = true, now } = {}) {
  let config = normalizeConfig();
  const getConfig = () => config;
  const http = createHttp({ fetch, now });
  const players = new Players({ gladys, getConfig, store, http, now });
  const puzzles = createPuzzles(http, now);
  const ready = players.load();
  let lastStatus = null;

  const poller = createPoller({ gladys, players, getConfig, afterCycle, timers, now });

  /** Publish what the last reads changed: devices, /data, status, widget. */
  async function afterCycle() {
    if (players.devicesChanged) {
      players.devicesChanged = false;
      await publishDevices();
    }
    await players.save();
    await updateStatus();
    if (players.widgetChanged) {
      players.widgetChanged = false;
      gladys.requestWidgetRefresh(WIDGET_KEY);
    }
  }

  async function publishDevices() {
    await gladys.publishDiscoveredDevices(players.buildDevices(config));
  }

  /** The status of the Configuration screen, sent when it changes. */
  async function updateStatus() {
    let status = { connected: true };
    if (config.players.length === 0) {
      status = { connected: false, message: TEXT.notConfigured };
    } else if (players.apiDown(config)) {
      status = { connected: false, message: TEXT.apiUnreachable };
    }
    const key = JSON.stringify(status);
    if (key !== lastStatus) {
      lastStatus = key;
      await gladys.setConnectionStatus(status.connected, status.message);
    }
  }

  function logConfig() {
    const count = (platform) => config.players.filter((p) => p.platform === platform).length;
    logger.info(
      `Following ${count('lichess')} Lichess and ${count('chesscom')} Chess.com player(s), every ${config.refreshMinutes} min`,
    );
    if (config.invalidPlayers.length > 0) {
      logger.warn(`Ignored, not usernames: ${config.invalidPlayers.join(', ')}`);
    }
    if (config.droppedPlayers.length > 0) {
      logger.warn(`Too many players: ${config.droppedPlayers.join(', ')} not read`);
    }
  }

  async function start() {
    await ready;
    players.prune(config);
    // The players known from /data first: the Discovery tab is complete even
    // before the first read, or while the sites are down.
    await publishDevices();
    await updateStatus();
    await poller.restart();
  }

  // --- Connection lifecycle ----------------------------------------------------
  // The SDK logs the WebSocket lifecycle itself.
  gladys.on('connected', async () => {
    try {
      config = normalizeConfig(await gladys.getConfig());
      logConfig();
      await start();
    } catch (err) {
      logger.error(`Post-connection initialization failed: ${err.message}`);
      await gladys.setConnectionStatus(false, TEXT.initFailed).catch(() => {});
    }
  });

  gladys.on('disconnected', () => {
    // Nothing reaches Gladys while it is away: the status is sent again on return.
    lastStatus = null;
  });

  gladys.onConfigUpdated(async (raw) => {
    logger.info('Configuration updated');
    const previousLanguage = config.language;
    config = normalizeConfig(raw);
    logConfig();
    if (config.language !== previousLanguage) {
      // The last game text is written in the configured language.
      gladys.forgetPublishedStates();
    }
    await start();
    gladys.requestWidgetRefresh(WIDGET_KEY);
  });

  // --- Discovery -----------------------------------------------------------------
  gladys.onScanRequest(async () => {
    await ready;
    // A player never read yet is read now, so the list shows it.
    const unread = config.players.map(playerKey).filter((key) => !players.records.has(key));
    if (unread.length > 0) {
      await poller.refreshNow(unread);
    }
    await publishDevices();
  });

  // --- Polling: the timer's fallback --------------------------------------------
  gladys.onPoll((device) => poller.pollFromCore(device));

  // --- A device added (or updated) in Gladys: its states now ---------------------
  // The core dropped the states sent before the device existed: send
  // everything again (after a read when the last one is older than a
  // minute), and nudge the widget, which can now show it.
  async function onDeviceAdded(device) {
    await ready;
    const record = players.recordByDevice(device.external_id);
    if (!record) {
      return;
    }
    await poller.refreshNow([playerKey(record)], { maxAgeMs: 60_000 });
    await players.publishStates(record, { force: true });
    gladys.requestWidgetRefresh(WIDGET_KEY);
  }
  gladys.onDeviceCreated(onDeviceAdded);
  gladys.onDeviceUpdated(onDeviceAdded);
  gladys.onDeviceDeleted(async () => {
    gladys.requestWidgetRefresh(WIDGET_KEY);
  });

  // --- Configuration screen button ----------------------------------------------
  gladys.onAction(ACTION.CHECK_PLAYERS, async () => {
    logger.info('Action: check the players');
    await ready;
    return checkPlayers(players, poller, config);
  });

  // --- Scene actions ---------------------------------------------------------------
  gladys.onSceneAction(SCENE_ACTION.GET_PLAYER, async (fields) => {
    await ready;
    return getPlayer(players, fields ?? {}, config.language);
  });
  gladys.onSceneAction(SCENE_ACTION.GET_DAILY_PUZZLE, async (fields) =>
    getDailyPuzzle(puzzles, fields ?? {}, config.language),
  );

  // --- Dashboard widget -----------------------------------------------------------
  gladys.onWidgetGet(WIDGET_KEY, async ({ settings, language }) => {
    await ready;
    return buildContent({ players, puzzles, gladys, settings, language });
  });

  return {
    players,
    poller,
    puzzles,
    ready,
    getConfig,
    /** Stop the timer and wait for the last write under /data. */
    async stop() {
      poller.stop();
      await store.flush?.();
    },
  };
}

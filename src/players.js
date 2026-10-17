// -----------------------------------------------------------------------------
// The followed players, what the integration knows about them, and what it
// publishes to Gladys.
//
// Reading a player updates its "record" (display name, ratings, best ratings,
// last game, today's games), persisted under /data; the record gives the
// Gladys device (src/devices.js) and its states.
//
// Games: each read asks for the games since the last one seen (and at least
// since local midnight, for today's counters). A game that ended after the
// last one seen fires "Game finished", in order, five at most per read. The
// first look at a player fires nothing: the games played before are not news.
//
// Records: the best rating of each time control is seeded on the first look
// (Lichess rating history, Chess.com "best"), then a rating above it fires
// "New rating record". A provisional Lichess rating never does.
//
// Only the players whose device the user added fire events.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import * as lichess from './lichess.js';
import * as chesscom from './chesscom.js';
import { isTransient } from './http.js';
import { playerKey } from './config.js';
import { RATING_CONTROLS, buildDevice, deviceName, idsOf } from './devices.js';
import { MESSAGES, PLATFORM_NAMES, RESULTS } from './i18n.js';
import { createIssueLog } from './issues.js';
import { localDate, localMidnight } from './time.js';

const logger = createLogger({ name: 'players' });

/** Keys of the scene triggers. */
export const TRIGGER = {
  GAME_FINISHED: 'game_finished',
  RATING_RECORD: 'rating_record',
};

/** Most "Game finished" events fired by one read (after a long outage, say). */
export const MAX_GAME_EVENTS = 5;

/** An unchanged value is published again this often (Gladys: "no recent value" past 48 h). */
export const STATE_HEARTBEAT_MS = 6 * 60 * 60 * 1000;

const STORE_VERSION = 1;

export class Players {
  /**
   * @param {object} options
   * @param {object} options.gladys GladysIntegration (or the SDK's fake Gladys)
   * @param {() => object} options.getConfig the current normalized config
   * @param {{ load: Function, save: Function }} options.store
   * @param {ReturnType<import('./http.js').createHttp>} options.http
   * @param {() => number} [options.now]
   */
  constructor({ gladys, getConfig, store, http, now = () => Date.now() }) {
    this.gladys = gladys;
    this.getConfig = getConfig;
    this.store = store;
    this.http = http;
    this.now = now;
    /** Record by player key ("lichess:thibault"). */
    this.records = new Map();
    /** Set when the device list must be published again (a player read for the first time). */
    this.devicesChanged = false;
    /** Set when the widget content changed. */
    this.widgetChanged = false;
    /** Scene events waiting for the publication of their player's states, by key. */
    this.pendingEvents = new Map();
    /** Outcome of the last read of each player: { ok, error?, notFound?, transient? }. */
    this.lastResults = new Map();
    this.persistNeeded = false;
    this.issues = createIssueLog(logger);
  }

  async load() {
    const data = await this.store.load();
    if (data.version !== STORE_VERSION) {
      return;
    }
    for (const record of data.records ?? []) {
      if (record && typeof record.id === 'string' && RATING_CONTROLS[record.platform]) {
        record.ratings ??= {};
        record.best ??= {};
        this.records.set(playerKey(record), record);
      }
    }
  }

  /** The configured players, in configuration order. */
  players(config = this.getConfig()) {
    return config.players;
  }

  /** The records of the configured players that were read once. */
  configuredRecords(config = this.getConfig()) {
    return this.players(config)
      .map((player) => this.records.get(playerKey(player)))
      .filter(Boolean);
  }

  /** The record behind a device external id, among the configured ones. */
  recordByDevice(externalId, config = this.getConfig()) {
    return this.configuredRecords(config).find(
      (record) => idsOf(this.gladys, record).device === externalId,
    );
  }

  /** The discovery payload: one device per configured player read once. */
  buildDevices(config = this.getConfig()) {
    return this.configuredRecords(config).map((record) =>
      buildDevice(this.gladys, record, config.language),
    );
  }

  createdDevice(record) {
    const external = idsOf(this.gladys, record).device;
    return (this.gladys.devices ?? []).find((device) => device.external_id === external);
  }

  isCreated(record) {
    return Boolean(this.createdDevice(record));
  }

  /** The name the user gave the device in Gladys, else the username. */
  nameOf(record) {
    return this.createdDevice(record)?.name || record.name || record.id;
  }

  /** Today's counters, zero once the day they were counted is over. */
  today(record) {
    const today = record.today;
    if (!today || today.date !== localDate(this.now())) {
      return { games: 0, wins: 0, draws: 0, losses: 0 };
    }
    return today;
  }

  /** The ratings of a record, the most played first: [{ control, rating, games }]. */
  ratingsOf(record, { withPuzzle = true } = {}) {
    return Object.entries(record.ratings ?? {})
      .filter(([control]) => withPuzzle || control !== 'puzzle')
      .map(([control, value]) => ({ control, rating: value.rating, games: value.games }))
      .sort((a, b) => b.games - a.games);
  }

  /**
   * Read several players: one Lichess status request for all, then each
   * player in turn. A player that fails never stops the others.
   * @param {Array<{ platform: string, id: string, name: string }>} players
   */
  async refreshPlayers(players) {
    const lichessIds = players.filter((p) => p.platform === 'lichess').map((p) => p.id);
    let statuses = null;
    if (lichessIds.length > 0) {
      try {
        statuses = await lichess.fetchStatuses(this.http, lichessIds);
        this.issues.ok('lichess-status', 'Lichess online statuses read again');
      } catch (err) {
        this.issues.fail('lichess-status', `Lichess online statuses: ${err.message}`);
      }
    }
    for (const player of players) {
      try {
        await this.refresh(player, statuses);
      } catch (err) {
        // Logged once by the issue log; the next cycle retries.
        logger.debug(`${playerKey(player)}: ${err.message}`);
      }
    }
  }

  /**
   * Read one player and publish what changed. Throws the read error after
   * recording it for the check action.
   */
  async refresh(player, statuses = null) {
    const key = playerKey(player);
    const label = `${PLATFORM_NAMES[player.platform]} player ${player.name}`;
    let snapshot;
    try {
      snapshot = await this.read(player);
      this.issues.ok(key, `${label} read again`);
    } catch (err) {
      const notFound = err instanceof lichess.PlayerNotFoundError;
      this.issues.fail(
        key,
        notFound ? `${label} not found: check the username` : `${label}: ${err.message}`,
      );
      this.lastResults.set(key, {
        ok: false,
        error: err.message,
        notFound,
        transient: isTransient(err),
      });
      throw err;
    }
    this.lastResults.set(key, { ok: true });
    const record = this.apply(player, snapshot, statuses);
    try {
      await this.publishStates(record);
      this.issues.ok('gladys', 'Gladys accepts the states again');
    } catch (err) {
      this.issues.fail('gladys', `Cannot publish to Gladys: ${err.message}`);
    }
    return record;
  }

  /** Since when the games must be read: the last one seen, and midnight at least. */
  gamesSince(previous) {
    const midnight = localMidnight(this.now());
    return previous?.watermark ? Math.min(midnight, previous.watermark) : midnight;
  }

  /** Everything the platform says about a player now. */
  async read(player) {
    const previous = this.records.get(playerKey(player));
    const since = this.gamesSince(previous);
    if (player.platform === 'lichess') {
      const user = await lichess.fetchUser(this.http, player.id);
      let apiBest = {};
      if (!previous) {
        apiBest = await lichess.fetchBestRatings(this.http, player.id).catch((err) => {
          logger.debug(`${player.id}: no rating history (${err.message})`);
          return {};
        });
      }
      let games = await lichess.fetchGames(this.http, player.id, since);
      if (games.length === 0 && !previous?.lastGame) {
        games = await lichess.fetchGames(this.http, player.id, null, 1);
      }
      return { ...user, apiBest, games };
    }

    const profile = previous?.url
      ? { name: previous.name, title: previous.title, url: previous.url }
      : await chesscom.fetchProfile(this.http, player.id);
    const stats = await chesscom.fetchStats(this.http, player.id);
    // The UTC month now, and the previous one when the games to read start
    // there (or to find the last game on a first look early in a month).
    const startOfMonth = Date.UTC(
      new Date(this.now()).getUTCFullYear(),
      new Date(this.now()).getUTCMonth(),
      1,
    );
    const months = [chesscom.monthOf(this.now())];
    const games = await chesscom.fetchMonthGames(this.http, player.id, months[0]);
    if (since < startOfMonth || (games.length === 0 && !previous?.lastGame)) {
      months.push(chesscom.monthOf(startOfMonth - 1));
      games.push(...(await chesscom.fetchMonthGames(this.http, player.id, months[1])));
    }
    // The cached archives of the months no longer read are dropped.
    const base = chesscom.monthUrl(player.id, '');
    this.http.forget(
      (url) => url.startsWith(base) && !months.some((month) => url === base + month),
    );
    return { ...profile, ratings: stats.ratings, apiBest: stats.best, games };
  }

  /** Merge a read into the record of the player; queue the scene events. */
  apply(player, snapshot, statuses) {
    const key = playerKey(player);
    let record = this.records.get(key);
    const first = !record;
    if (first) {
      record = {
        platform: player.platform,
        id: player.id,
        best: {},
        ratings: {},
        watermark: null,
        lastGame: null,
        today: null,
        online: null,
        playing: null,
      };
      this.records.set(key, record);
      this.devicesChanged = true;
    }
    record.name = snapshot.name;
    record.title = snapshot.title;
    record.url = snapshot.url;
    if (first) {
      logger.info(`${deviceName(record)} found`);
    }
    const followed = !first && this.isCreated(record);
    const language = this.getConfig().language;
    const device = idsOf(this.gladys, record).device;
    const playerName = this.nameOf(record);
    const events = [];

    // Ratings and records.
    const previousRatings = JSON.stringify(record.ratings);
    for (const [control, value] of Object.entries(snapshot.ratings)) {
      const known = record.best[control];
      if (followed && known !== undefined && value.rating > known && !value.provisional) {
        events.push({
          key: TRIGGER.RATING_RECORD,
          log: `${deviceName(record)}: new ${control} record ${value.rating}`,
          data: {
            device,
            player_name: playerName,
            time_control: control,
            rating: value.rating,
            previous_best: known,
            summary: MESSAGES.recordEvent(playerName, control, value.rating, known)[language],
          },
        });
      }
      record.best[control] = Math.max(
        known ?? -Infinity,
        value.rating,
        snapshot.apiBest?.[control] ?? -Infinity,
      );
    }
    record.ratings = snapshot.ratings;
    if (JSON.stringify(record.ratings) !== previousRatings) {
      this.widgetChanged = true;
    }

    // Online and playing (Lichess): absent from the answer means neither.
    if (player.platform === 'lichess' && statuses) {
      const status = statuses.get(player.id) ?? { online: false, playing: false };
      if (status.online !== record.online || status.playing !== record.playing) {
        this.widgetChanged = true;
      }
      record.online = status.online;
      record.playing = status.playing;
    }

    // Games.
    const games = [...snapshot.games].sort((a, b) => a.endedAt - b.endedAt);
    const newest = games.at(-1);
    if (record.watermark !== null) {
      const fresh = games.filter((game) => game.endedAt > record.watermark);
      if (followed) {
        if (fresh.length > MAX_GAME_EVENTS) {
          logger.info(
            `${deviceName(record)}: ${fresh.length} new games, the last ${MAX_GAME_EVENTS} fire the scenes`,
          );
        }
        for (const game of fresh.slice(-MAX_GAME_EVENTS)) {
          events.push({
            key: TRIGGER.GAME_FINISHED,
            log: `${deviceName(record)}: ${game.result} against ${game.opponent}`,
            data: gameEventData(device, playerName, game, language),
          });
        }
      }
    }
    if (newest && newest.endedAt > (record.watermark ?? -Infinity)) {
      record.lastGame = newest;
      record.watermark = newest.endedAt;
      this.widgetChanged = true;
    } else if (record.watermark === null) {
      // Never played: the next game is the first news.
      record.watermark = this.now();
    }
    const midnight = localMidnight(this.now());
    const today = { date: localDate(this.now()), games: 0, wins: 0, draws: 0, losses: 0 };
    for (const game of games.filter((g) => g.endedAt >= midnight)) {
      today.games += 1;
      today[{ win: 'wins', draw: 'draws', loss: 'losses' }[game.result]] += 1;
    }
    record.today = today;

    if (events.length > 0) {
      this.pendingEvents.set(key, [...(this.pendingEvents.get(key) ?? []), ...events]);
    }
    this.persistNeeded = true;
    return record;
  }

  /** The states of a record, by feature key. */
  states(record) {
    const ids = idsOf(this.gladys, record);
    const language = this.getConfig().language;
    const states = [];
    const push = (key, state) =>
      states.push({ device_feature_external_id: ids.feature(key), state });
    for (const control of RATING_CONTROLS[record.platform]) {
      const value = record.ratings?.[control];
      if (value) {
        push(`rating_${control}`, value.rating);
      }
    }
    if (record.platform === 'lichess' && record.online !== null) {
      push('online', record.online ? 1 : 0);
      push('playing', record.playing ? 1 : 0);
    }
    if (record.lastGame) {
      states.push({
        device_feature_external_id: ids.feature('last_game'),
        text: MESSAGES.game(record.lastGame)[language],
      });
    }
    const today = this.today(record);
    push('games_today', today.games);
    push('wins_today', today.wins);
    return states;
  }

  /**
   * Publish the states of a player whose device exists in Gladys (only the
   * changes, plus a heartbeat), then its scene events.
   * @param {object} record
   * @param {{ force?: boolean }} [options] force: the device was just added
   */
  async publishStates(record, { force = false } = {}) {
    const key = playerKey(record);
    if (!this.isCreated(record)) {
      this.pendingEvents.delete(key);
      return;
    }
    if (force) {
      this.gladys.forgetPublishedStates(idsOf(this.gladys, record).device);
    }
    await this.gladys.publishChangedStates(this.states(record), {
      heartbeat: STATE_HEARTBEAT_MS,
    });
    // An event leaves the queue once Gladys took it: a failed publication is
    // tried again after the next read.
    const events = this.pendingEvents.get(key) ?? [];
    while (events.length > 0) {
      const event = events[0];
      await this.gladys.publishSceneEvent(event.key, event.data);
      events.shift();
      logger.info(event.log);
    }
    this.pendingEvents.delete(key);
  }

  /** Forget the records of the players no longer configured. */
  prune(config = this.getConfig()) {
    const kept = new Set(this.players(config).map(playerKey));
    for (const key of this.records.keys()) {
      if (!kept.has(key)) {
        this.records.delete(key);
        this.lastResults.delete(key);
        this.persistNeeded = true;
      }
    }
  }

  /**
   * True when the APIs themselves look down: every configured player failed
   * its last read for a network, rate-limit or server reason.
   */
  apiDown(config = this.getConfig()) {
    const results = this.players(config).map((player) => this.lastResults.get(playerKey(player)));
    return (
      results.length > 0 && results.every((result) => result && !result.ok && result.transient)
    );
  }

  /** Persist if anything changed since the last save. */
  async save() {
    if (this.persistNeeded) {
      this.persistNeeded = false;
      await this.store.save({ version: STORE_VERSION, records: [...this.records.values()] });
    }
  }
}

/** The data of a "Game finished" event: the filters (result, time_control) and the variables. */
function gameEventData(device, playerName, game, language) {
  const data = {
    device,
    player_name: playerName,
    result: game.result,
    time_control: game.timeControl,
    result_text: RESULTS[language][game.result],
    opponent: game.opponent,
    url: game.url,
    summary: MESSAGES.gameEvent(playerName, game)[language],
  };
  if (game.rating !== null) {
    data.rating = game.rating;
  }
  if (game.ratingDiff !== null) {
    data.rating_diff = game.ratingDiff;
  }
  if (game.opponentRating !== null) {
    data.opponent_rating = game.opponentRating;
  }
  return data;
}

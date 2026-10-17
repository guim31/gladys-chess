// -----------------------------------------------------------------------------
// The Gladys devices: one per followed player.
//
// External ids (forever, see CLAUDE.md):
//   device  : ext:<selector>:<platform>:<lowercase username>
//   feature : ext:<selector>:<platform>:<lowercase username>:<feature key>
// <platform> is "lichess" or "chesscom". Both sites keep a username for the
// life of the account (Lichess only allows a change of case), so it is the
// player's id there.
//
// The features are fixed per platform: a time control the player never
// played simply has no state until the first game.
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES as CATEGORIES,
  DEVICE_FEATURE_TYPES as TYPES,
  DEVICE_POLL_FREQUENCIES,
} from '@gladysassistant/integration-sdk';
import { NAMES, PLATFORM_NAMES } from './i18n.js';

/** The ratings of each platform, by time control. */
export const RATING_CONTROLS = {
  lichess: ['bullet', 'blitz', 'rapid', 'classical', 'daily', 'puzzle'],
  chesscom: ['bullet', 'blitz', 'rapid', 'daily'],
};

/** The time controls of the games (the "Game finished" filter). */
export const GAME_CONTROLS = ['bullet', 'blitz', 'rapid', 'classical', 'daily'];

// min/max are display bounds (Gladys never clamps a state): Glicko ratings
// stay between 400 and 3500 on both sites.
const rating = { category: CATEGORIES.COUNTER_SENSOR, type: TYPES.SENSOR.INTEGER };
const binary = { category: CATEGORIES.INPUT, type: TYPES.INPUT.BINARY, min: 0, max: 1 };
const counter = {
  category: CATEGORIES.COUNTER_SENSOR,
  type: TYPES.SENSOR.INTEGER,
  min: 0,
  max: 500,
};
const text = { category: CATEGORIES.TEXT, type: TYPES.TEXT.TEXT, min: 0, max: 0 };

/** The feature keys of a platform, in display order. */
export function featureKeys(platform) {
  return [
    ...RATING_CONTROLS[platform].map((control) => `rating_${control}`),
    ...(platform === 'lichess' ? ['online', 'playing'] : []),
    'last_game',
    'games_today',
    'wins_today',
  ];
}

function spec(key) {
  if (key.startsWith('rating_')) {
    return { ...rating, min: 0, max: 3500 };
  }
  if (key === 'online' || key === 'playing') {
    return binary;
  }
  return key === 'last_game' ? text : counter;
}

/** The name of a feature, in a language. */
export function featureName(platform, key, language) {
  const names = NAMES[language] ?? NAMES.fr;
  return platform === 'chesscom' && key === 'rating_daily'
    ? names.rating_daily_chesscom
    : names[key];
}

/**
 * The external ids of the device of a player.
 * @param {object} gladys
 * @param {{ platform: string, id: string }} player
 */
export function idsOf(gladys, player) {
  return gladys.externalIds(player.platform, player.id);
}

/** The device name: the username and the site. */
export function deviceName(record) {
  return `${record.name ?? record.id} (${PLATFORM_NAMES[record.platform]})`;
}

/**
 * The discovery payload of one player.
 * @param {object} gladys
 * @param {object} record
 * @param {string} language language of the feature names
 */
export function buildDevice(gladys, record, language) {
  const ids = idsOf(gladys, record);
  return {
    name: deviceName(record),
    external_id: ids.device,
    model: PLATFORM_NAMES[record.platform],
    // The container reads the players itself (src/poller.js). These two
    // fields only keep the core's onPoll as a fallback: once a minute, the
    // slowest pace Gladys schedules, skipped while the container's timer runs.
    should_poll: true,
    poll_frequency: DEVICE_POLL_FREQUENCIES.EVERY_MINUTES,
    features: featureKeys(record.platform).map((key) => ({
      name: featureName(record.platform, key, language),
      external_id: ids.feature(key),
      ...spec(key),
      read_only: true,
      has_feedback: false,
      // The last game text changes with every game: its history is the list of games.
      keep_history: key !== 'last_game',
    })),
    params: [
      { name: 'platform', value: record.platform },
      { name: 'username', value: record.name ?? record.id },
    ],
  };
}

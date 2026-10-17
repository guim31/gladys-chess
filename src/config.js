// -----------------------------------------------------------------------------
// Integration configuration.
//
// The configuration is filled in by the user in Gladys, from the `config_schema`
// declared in `gladys-assistant-integration.json`. This module provides the
// defaults and normalizes the received object, so the rest of the code never
// deals with `undefined`, names typed with spaces, or invalid values.
// -----------------------------------------------------------------------------

/** The languages of the Gladys interface, the ones every text carries. */
export const LANGUAGES = ['en', 'fr', 'de', 'es'];

/** The refresh intervals offered, in minutes. */
export const REFRESH_MINUTES = ['2', '5', '10', '15', '30'];

/**
 * At most this many players per platform: the APIs are free services, and
 * each player costs two requests per cycle.
 */
export const MAX_PLAYERS = 10;

/** The platforms, by key (the type of the device external ids: forever). */
export const PLATFORMS = ['lichess', 'chesscom'];

// Defaults: they MUST stay consistent with the `default` values declared in the
// `config_schema` of the manifest (test/manifest.test.js checks it).
export const DEFAULT_CONFIG = {
  lichess_players: '', // Lichess usernames, e.g. "thibault, DrNykterstein"
  chesscom_players: '', // Chess.com usernames, e.g. "hikaru"
  refresh_minutes: '5', // how often the players are read
  language: 'fr', // language of the feature names and of the generated texts
};

// Usernames as the platforms allow them (letters, digits, "_" and "-").
const USERNAME = {
  lichess: /^[a-z0-9][a-z0-9_-]{1,29}$/i,
  chesscom: /^[a-z0-9][a-z0-9_-]{2,24}$/i,
};

// A profile link copied from the site gives its username.
const PROFILE_LINK = {
  lichess: /lichess\.org\/@\/([^/?#\s]+)/i,
  chesscom: /chess\.com\/(?:member|players?)\/([^/?#\s]+)/i,
};

/**
 * Split a typed list of usernames. Commas, semicolons and spaces separate
 * them; a profile link gives its username. Duplicates (any case) are dropped,
 * the order and the case typed are kept.
 * @param {'lichess' | 'chesscom'} platform
 * @param {unknown} text
 * @returns {{ valid: string[], invalid: string[] }}
 */
export function parsePlayers(platform, text) {
  const valid = [];
  const invalid = [];
  for (const token of String(text ?? '').split(/[\s,;]+/)) {
    if (token === '') {
      continue;
    }
    const name = PROFILE_LINK[platform].exec(token)?.[1] ?? token.replace(/^@/, '');
    if (!USERNAME[platform].test(name)) {
      invalid.push(token);
    } else if (!valid.some((known) => known.toLowerCase() === name.toLowerCase())) {
      valid.push(name);
    }
  }
  return { valid, invalid };
}

/**
 * Merge the user config with the defaults and normalize every value.
 * @param {Record<string, unknown>} [raw] config returned by the SDK
 */
export function normalizeConfig(raw = {}) {
  const players = [];
  const invalid = [];
  const dropped = [];
  for (const platform of PLATFORMS) {
    const parsed = parsePlayers(
      platform,
      raw[`${platform}_players`] ?? DEFAULT_CONFIG[`${platform}_players`],
    );
    invalid.push(...parsed.invalid);
    dropped.push(...parsed.valid.slice(MAX_PLAYERS));
    for (const name of parsed.valid.slice(0, MAX_PLAYERS)) {
      players.push({ platform, id: name.toLowerCase(), name });
    }
  }
  const refresh = String(raw.refresh_minutes ?? DEFAULT_CONFIG.refresh_minutes).trim();
  const language = String(raw.language ?? DEFAULT_CONFIG.language).trim();
  return {
    players,
    invalidPlayers: invalid,
    droppedPlayers: dropped,
    refreshMinutes: REFRESH_MINUTES.includes(refresh)
      ? Number(refresh)
      : Number(DEFAULT_CONFIG.refresh_minutes),
    language: LANGUAGES.includes(language) ? language : DEFAULT_CONFIG.language,
  };
}

/** The key of a player in the integration: "<platform>:<lowercase username>". */
export const playerKey = (player) => `${player.platform}:${player.id}`;

/** The refresh period, in milliseconds. */
export function refreshPeriodMs(config) {
  return config.refreshMinutes * 60_000;
}

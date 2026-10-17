// -----------------------------------------------------------------------------
// The "Chess players" dashboard widget (Gladys 5.2+: link buttons).
//
// With a player chosen in its settings: up to four live rating tiles (bound
// to the device features, so they follow every state), the last game,
// today's games, online (Lichess), and links to the profile, the last game
// and the puzzle of the day. Without one: one row per added player with its
// main rating, and the puzzles of the day.
//
// Built from what the integration already read; only the puzzle of the day
// may be fetched (an hour of cache, five seconds at most, else a plain link).
// The core caches the content per (settings, language, units): the texts are
// localized in the language it asks for.
// -----------------------------------------------------------------------------

import { WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { LANGUAGES, PLATFORMS } from './config.js';
import { featureName, idsOf } from './devices.js';
import { MESSAGES, TEXT } from './i18n.js';
import { PUZZLE_PAGES } from './puzzles.js';

export const WIDGET_KEY = 'chess_players';

/** Seconds the core keeps a content. */
const TTL_SECONDS = 120;

/** Rating tiles of the single-player view. */
const MAX_TILES = 4;

/** Rows of the overview. */
const MAX_ROWS = 10;

/** The longest wait for a puzzle of the day. */
const PUZZLE_WAIT_MS = 5_000;

const clip = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** The puzzle of the day of a platform, or null (never throws, never waits long). */
async function puzzleOf(puzzles, platform) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(null), PUZZLE_WAIT_MS);
  });
  try {
    return await Promise.race([puzzles.get(platform).catch(() => null), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** The link button to the puzzle of the day: the puzzle itself when known. */
async function puzzleButton(puzzles, platform, lang) {
  const puzzle = await puzzleOf(puzzles, platform);
  return {
    type: 'button',
    label: TEXT[`${platform}Puzzle`][lang],
    icon: 'help-circle',
    style: 'secondary',
    link: { url: puzzle?.url ?? PUZZLE_PAGES[platform] },
  };
}

/** Online / in a game / offline, for a Lichess player. */
function presence(record) {
  if (record.playing) {
    return { key: 'playing', color: WIDGET_COLORS.WARNING, icon: 'play' };
  }
  return record.online
    ? { key: 'online', color: WIDGET_COLORS.SUCCESS, icon: 'wifi' }
    : { key: 'offline', color: WIDGET_COLORS.NEUTRAL, icon: 'moon' };
}

/**
 * The widget content.
 * @param {object} options
 * @param {import('./players.js').Players} options.players
 * @param {ReturnType<import('./puzzles.js').createPuzzles>} options.puzzles
 * @param {object} options.gladys
 * @param {{ player?: string }} [options.settings]
 * @param {string} [options.language]
 */
export async function buildContent({ players, puzzles, gladys, settings = {}, language = 'en' }) {
  const lang = LANGUAGES.includes(language) ? language : 'en';

  if (settings.player) {
    const record = players.recordByDevice(settings.player);
    if (!record) {
      return {
        ttl_seconds: TTL_SECONDS,
        components: [{ type: 'text', text: TEXT.unknownPlayer[lang] }],
      };
    }
    const ids = idsOf(gladys, record);
    const tiles = players
      .ratingsOf(record)
      .slice(0, MAX_TILES)
      .map(({ control }) => ({
        type: 'value',
        label: clip(featureName(record.platform, `rating_${control}`, lang), 24),
        device_feature: ids.feature(`rating_${control}`),
      }));
    const items = [
      {
        label: TEXT.lastGame[lang],
        value: record.lastGame
          ? clip(MESSAGES.gameShort(record.lastGame)[lang], 40)
          : TEXT.noGame[lang],
        color: record.lastGame
          ? {
              win: WIDGET_COLORS.SUCCESS,
              loss: WIDGET_COLORS.DANGER,
              draw: WIDGET_COLORS.NEUTRAL,
            }[record.lastGame.result]
          : WIDGET_COLORS.NEUTRAL,
        icon: 'flag',
      },
      {
        label: TEXT.today[lang],
        value: MESSAGES.today(players.today(record))[lang],
        icon: 'calendar',
      },
    ];
    if (record.platform === 'lichess' && record.online !== null) {
      const state = presence(record);
      items.push({
        label: TEXT.status[lang],
        value: TEXT[state.key][lang],
        color: state.color,
        icon: state.icon,
      });
    }
    const buttons = [];
    if (record.url) {
      buttons.push({
        type: 'button',
        label: TEXT.profile[lang],
        icon: 'user',
        style: 'secondary',
        link: { url: record.url },
      });
    }
    if (record.lastGame?.url) {
      buttons.push({
        type: 'button',
        label: TEXT.seeGame[lang],
        icon: 'external-link',
        style: 'secondary',
        link: { url: record.lastGame.url },
      });
    }
    buttons.push(await puzzleButton(puzzles, record.platform, lang));
    return {
      ttl_seconds: TTL_SECONDS,
      components: [...tiles, { type: 'status', items }, ...buttons],
    };
  }

  const created = players.configuredRecords().filter((record) => players.isCreated(record));
  // The puzzles of the sites followed (Lichess when none is).
  const platforms = PLATFORMS.filter((platform) =>
    players.players().some((player) => player.platform === platform),
  );
  const buttons = await Promise.all(
    (platforms.length > 0 ? platforms : ['lichess']).map((platform) =>
      puzzleButton(puzzles, platform, lang),
    ),
  );
  if (created.length === 0) {
    return {
      ttl_seconds: TTL_SECONDS,
      components: [{ type: 'text', text: TEXT.noPlayer[lang] }, ...buttons],
    };
  }
  return {
    ttl_seconds: TTL_SECONDS,
    components: [
      {
        type: 'status',
        items: created.slice(0, MAX_ROWS).map((record) => {
          const main = players.ratingsOf(record, { withPuzzle: false })[0];
          const item = {
            label: clip(players.nameOf(record), 40),
            value: main ? MESSAGES.rating(main.control, main.rating)[lang] : TEXT.noGame[lang],
            color: WIDGET_COLORS.NEUTRAL,
            icon: 'user',
          };
          if (record.platform === 'lichess' && record.online !== null) {
            const state = presence(record);
            item.color = state.color;
            item.icon = state.icon;
          }
          return item;
        }),
      },
      ...buttons,
    ],
  };
}

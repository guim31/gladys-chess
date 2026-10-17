// -----------------------------------------------------------------------------
// Configuration screen button: "Check the players". Reads every configured
// player now (unless read in the last minute) and says what each site
// answered: the best way to check a username.
// -----------------------------------------------------------------------------

import { playerKey } from './config.js';
import { MESSAGES, TEXT } from './i18n.js';

export const ACTION = {
  CHECK_PLAYERS: 'check_players',
};

/** Join multi-language lines into one multi-language text. */
function joinLines(lines) {
  return Object.fromEntries(
    Object.keys(lines[0]).map((lang) => [
      lang,
      lines
        .map((line) => line[lang])
        .filter(Boolean)
        .join('\n'),
    ]),
  );
}

/**
 * @param {import('./players.js').Players} players
 * @param {ReturnType<import('./poller.js').createPoller>} poller
 * @param {object} config the normalized config
 */
export async function checkPlayers(players, poller, config) {
  const ignored = MESSAGES.ignored(config.invalidPlayers, config.droppedPlayers);
  if (config.players.length === 0) {
    return config.invalidPlayers.length > 0
      ? joinLines([TEXT.notConfigured, ignored])
      : TEXT.notConfigured;
  }
  await poller.refreshNow(config.players.map(playerKey), { maxAgeMs: 60_000 });
  const lines = config.players.map((player) => {
    const record = players.records.get(playerKey(player));
    const result = players.lastResults.get(playerKey(player));
    const failed = result && !result.ok;
    return MESSAGES.check({
      platform: player.platform,
      name: record?.name ?? player.name,
      ratings: record ? players.ratingsOf(record) : [],
      error: failed ? result.error : null,
      notFound: failed && result.notFound,
    });
  });
  return joinLines([...lines, ignored]);
}

// -----------------------------------------------------------------------------
// Scene actions (Gladys 5.1+).
//
//   get_player       : the ratings and today's games of a player, with a
//                      sentence ready for a notification. Read from what the
//                      integration already knows: no request to the sites.
//   get_daily_puzzle : the puzzle of the day of Lichess or Chess.com, its link
//                      and a sentence ready for a notification.
//
// The triggers "Game finished" and "New rating record" are fired by
// src/players.js.
// -----------------------------------------------------------------------------

import { MESSAGES, TEXT } from './i18n.js';

export const SCENE_ACTION = {
  GET_PLAYER: 'get_player',
  GET_DAILY_PUZZLE: 'get_daily_puzzle',
};

/** The ratings given as outputs of their own. */
export const RATING_OUTPUTS = ['bullet', 'blitz', 'rapid', 'classical', 'daily', 'puzzle'];

/**
 * @param {import('./players.js').Players} players
 * @param {{ player?: string }} fields
 * @param {string} language
 */
export function getPlayer(players, fields, language) {
  const record = fields.player ? players.recordByDevice(fields.player) : undefined;
  if (!record) {
    throw new Error(MESSAGES.thrown(TEXT.unknownPlayer));
  }
  const today = players.today(record);
  const outputs = {
    summary: MESSAGES.summary({
      name: players.nameOf(record),
      ratings: players.ratingsOf(record),
      today,
      lastGame: record.lastGame,
    })[language],
    games_today: today.games,
    wins_today: today.wins,
  };
  for (const control of RATING_OUTPUTS) {
    const value = record.ratings?.[control];
    if (value) {
      outputs[`rating_${control}`] = value.rating;
    }
  }
  if (record.lastGame) {
    outputs.last_result = record.lastGame.result;
    outputs.last_opponent = record.lastGame.opponent;
  }
  if (record.platform === 'lichess' && record.online !== null) {
    outputs.online = record.online;
  }
  return outputs;
}

/**
 * @param {ReturnType<import('./puzzles.js').createPuzzles>} puzzles
 * @param {{ platform?: string }} fields
 * @param {string} language
 */
export async function getDailyPuzzle(puzzles, fields, language) {
  // A scene action applies no default: an empty choice is Lichess.
  const platform = fields.platform === 'chesscom' ? 'chesscom' : 'lichess';
  let puzzle;
  try {
    puzzle = await puzzles.get(platform);
  } catch {
    throw new Error(MESSAGES.thrown(TEXT.puzzleUnavailable));
  }
  const outputs = { url: puzzle.url, message: MESSAGES.puzzle(puzzle)[language] };
  if (puzzle.title) {
    outputs.title = puzzle.title;
  }
  if (puzzle.rating) {
    outputs.rating = puzzle.rating;
  }
  return outputs;
}

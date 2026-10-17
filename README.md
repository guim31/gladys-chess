# Lichess & Chess.com for Gladys Assistant

Follow chess players of [Lichess](https://lichess.org) and
[Chess.com](https://www.chess.com) in
[Gladys Assistant](https://gladysassistant.com): ratings, games of the day,
last game, online status, rating records, and the puzzle of the day.

This integration is not affiliated with Lichess or Chess.com. It reads public
data only, with no account.

## What it does

- **One device per player** (10 per site): a rating per time control (bullet,
  blitz, rapid, classical, correspondence/Daily, Lichess puzzles), online and
  in a game (Lichess), the last game as a sentence, games and wins of the day.
- **Scene triggers**: _Game finished_ (filters: player, result, time control;
  variables: opponent, ratings, link, summary) and _New rating record_.
- **Scene actions**: _Get a chess player_ (ratings, today, a sentence for a
  notification) and _Get the puzzle of the day_ (Lichess or Chess.com).
- **Dashboard widget** _Chess players_: live rating tiles, last game, score of
  the day, links to the profile, the game and the puzzle of the day; or one row
  per player.
- Texts in English, French, German and Spanish.

The full user documentation: [en](docs/en.md), [fr](docs/fr.md),
[de](docs/de.md), [es](docs/es.md).

## Requirements

- Gladys Assistant 5.2.0 or later.
- Internet access to `lichess.org` and `api.chess.com`.

## Installation

In Gladys: **Integrations → Install from GitHub**, address
`https://github.com/guim31/gladys-chess`. Type the usernames in the
configuration, then add the players from the **Discovery** tab.

## Respect of the APIs

- One request at a time per site, as
  [Lichess asks](https://lichess.org/api);
  after a 429 answer, nothing is sent to that site for a full minute.
- An explicit `User-Agent` with the address of this repository, as the
  [Chess.com Published-Data API](https://www.chess.com/news/view/published-data-api)
  asks, and conditional requests (`If-None-Match`): a month of games already
  read costs a 304.
- Per player and refresh (5 minutes by default, 2 at the fastest): Lichess
  profile and games of the day, plus one online-status request for all
  players; Chess.com stats and the month of games. The rating history and the
  Chess.com profile are read once. The puzzles of the day are read on demand,
  once an hour at most.

## Limits

- No online status for Chess.com players: its public API no longer has it.
- Lichess lists games by start date: a long correspondence game may be missed
  by "Game finished".
- Chess.com does not give the rating change of a game.
- Developed and tested against the real public APIs (fixtures recorded on
  17/10/2026), not yet in a real Gladys: feedback welcome.

## Development

```bash
npm install
npm test                 # node --test, never touches the network
npm run lint
npm run format:check
npx -y github:GladysAssistant/integration-store --skip-image-check .
```

See [CLAUDE.md](CLAUDE.md) for the architecture and the pitfalls of the Gladys
core. Versions and releases are made by the Release workflow.

## Credits

- [Lichess](https://lichess.org) (free and open source,
  [API](https://lichess.org/api)) and [Chess.com](https://www.chess.com)
  ([Published-Data API](https://www.chess.com/news/view/published-data-api)).
  The test fixtures are real public answers of both APIs, for players who are
  public figures (`thibault`, `DrNykterstein`, `hikaru`, `erik`).
- The Home Assistant community integrations for Lichess and Chess.com showed
  which values people follow; no code was copied.

## License

[Apache-2.0](LICENSE)

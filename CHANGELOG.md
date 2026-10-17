# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

## [1.0.0] - 2026-10-17

### Added

- Follow Lichess and Chess.com players (10 per site) from their public
  profiles, with no account: one Gladys device per player.
- Features: a rating per time control (bullet, blitz, rapid, classical,
  correspondence/Daily, Lichess puzzles), online and in a game (Lichess), last
  game, games and wins of the day.
- Scene triggers "Game finished" (filters: player, result, time control) and
  "New rating record".
- Scene actions "Get a chess player" and "Get the puzzle of the day".
- Dashboard widget "Chess players": rating tiles, last game, score of the day,
  links to the profile, the last game and the puzzle of the day.
- "Check the players" button in the configuration.
- English, French, German and Spanish texts and documentation.

[Unreleased]: https://github.com/guim31/gladys-chess/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/guim31/gladys-chess/releases/tag/v1.0.0

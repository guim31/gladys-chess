// -----------------------------------------------------------------------------
// Every text the integration shows to the user, in the four languages of the
// Gladys interface (en, fr, de, es). German says "du", Spanish says "usted",
// like the rest of guim31's integrations. Brands (Lichess, Chess.com) and the
// chess time controls bullet, blitz and rapid are not translated.
//
//   - NAMES    : the feature names, in the language of the configuration
//                (Gladys freezes a name when the device is created);
//   - CONTROLS : the time controls, RESULTS : win, loss, draw;
//   - TEXT     : fixed texts (widget, statuses, errors);
//   - MESSAGES : texts built from values (summaries, action results).
//
// test/i18n.test.js checks that every entry carries the four languages.
// -----------------------------------------------------------------------------

import { LANGUAGES } from './config.js';

/** Feature names, by language then feature key. */
export const NAMES = {
  en: {
    rating_bullet: 'Bullet rating',
    rating_blitz: 'Blitz rating',
    rating_rapid: 'Rapid rating',
    rating_classical: 'Classical rating',
    rating_daily: 'Correspondence rating',
    rating_daily_chesscom: 'Daily rating',
    rating_puzzle: 'Puzzle rating',
    online: 'Online',
    playing: 'In a game',
    last_game: 'Last game',
    games_today: 'Games today',
    wins_today: 'Wins today',
  },
  fr: {
    rating_bullet: 'Classement bullet',
    rating_blitz: 'Classement blitz',
    rating_rapid: 'Classement rapide',
    rating_classical: 'Classement classique',
    rating_daily: 'Classement correspondance',
    rating_daily_chesscom: 'Classement Daily',
    rating_puzzle: 'Classement problèmes',
    online: 'En ligne',
    playing: 'En partie',
    last_game: 'Dernière partie',
    games_today: 'Parties du jour',
    wins_today: 'Victoires du jour',
  },
  de: {
    rating_bullet: 'Bullet-Wertung',
    rating_blitz: 'Blitz-Wertung',
    rating_rapid: 'Schnellschach-Wertung',
    rating_classical: 'Klassisch-Wertung',
    rating_daily: 'Fernschach-Wertung',
    rating_daily_chesscom: 'Daily-Wertung',
    rating_puzzle: 'Puzzle-Wertung',
    online: 'Online',
    playing: 'In einer Partie',
    last_game: 'Letzte Partie',
    games_today: 'Partien heute',
    wins_today: 'Siege heute',
  },
  es: {
    rating_bullet: 'Puntuación bullet',
    rating_blitz: 'Puntuación blitz',
    rating_rapid: 'Puntuación rápida',
    rating_classical: 'Puntuación clásica',
    rating_daily: 'Puntuación por correspondencia',
    rating_daily_chesscom: 'Puntuación Daily',
    rating_puzzle: 'Puntuación de problemas',
    online: 'En línea',
    playing: 'En partida',
    last_game: 'Última partida',
    games_today: 'Partidas de hoy',
    wins_today: 'Victorias de hoy',
  },
};

/** The time controls, as written inside a sentence. */
export const CONTROLS = {
  en: {
    bullet: 'bullet',
    blitz: 'blitz',
    rapid: 'rapid',
    classical: 'classical',
    daily: 'correspondence',
    puzzle: 'puzzles',
  },
  fr: {
    bullet: 'bullet',
    blitz: 'blitz',
    rapid: 'rapide',
    classical: 'classique',
    daily: 'correspondance',
    puzzle: 'problèmes',
  },
  de: {
    bullet: 'Bullet',
    blitz: 'Blitz',
    rapid: 'Schnellschach',
    classical: 'klassisch',
    daily: 'Fernschach',
    puzzle: 'Puzzles',
  },
  es: {
    bullet: 'bullet',
    blitz: 'blitz',
    rapid: 'rápidas',
    classical: 'clásicas',
    daily: 'correspondencia',
    puzzle: 'problemas',
  },
};

/** Game results. */
export const RESULTS = {
  en: { win: 'Win', loss: 'Loss', draw: 'Draw' },
  fr: { win: 'Victoire', loss: 'Défaite', draw: 'Nulle' },
  de: { win: 'Sieg', loss: 'Niederlage', draw: 'Remis' },
  es: { win: 'Victoria', loss: 'Derrota', draw: 'Tablas' },
};

/** "against", before the opponent. */
const AGAINST = { en: 'vs', fr: 'contre', de: 'gegen', es: 'contra' };

/** The brands, as shown. */
export const PLATFORM_NAMES = { lichess: 'Lichess', chesscom: 'Chess.com' };

export const TEXT = {
  notConfigured: {
    en: 'No player to follow: type a Lichess or Chess.com username in the configuration.',
    fr: 'Aucun joueur suivi : saisissez un pseudo Lichess ou Chess.com dans la configuration.',
    de: 'Kein Spieler verfolgt: gib einen Lichess- oder Chess.com-Namen in der Konfiguration ein.',
    es: 'Ningún jugador seguido: escriba un usuario de Lichess o Chess.com en la configuración.',
  },
  apiUnreachable: {
    en: 'Lichess and Chess.com cannot be reached for now: new try at the next refresh.',
    fr: 'Lichess et Chess.com sont injoignables pour le moment : nouvel essai au prochain relevé.',
    de: 'Lichess und Chess.com sind gerade nicht erreichbar: neuer Versuch beim nächsten Abruf.',
    es: 'Lichess y Chess.com no responden por ahora: nuevo intento en la próxima lectura.',
  },
  initFailed: {
    en: 'Initialization failed, check the integration logs.',
    fr: "L'initialisation a échoué, consultez les journaux de l'intégration.",
    de: 'Die Initialisierung ist fehlgeschlagen, sieh dir die Logs der Integration an.',
    es: 'La inicialización ha fallado, consulte los registros de la integración.',
  },
  noPlayer: {
    en: 'No player added to Gladys yet: add them in the Discovery tab of the integration.',
    fr: "Aucun joueur ajouté à Gladys : ajoutez-les dans l'onglet Découverte de l'intégration.",
    de: 'Noch kein Spieler in Gladys: füge sie im Tab „Entdecken“ der Integration hinzu.',
    es: 'Ningún jugador añadido a Gladys: añádalos en la pestaña Descubrir de la integración.',
  },
  unknownPlayer: {
    en: 'This player is no longer followed: check the configuration of the integration.',
    fr: "Ce joueur n'est plus suivi : vérifiez la configuration de l'intégration.",
    de: 'Dieser Spieler wird nicht mehr verfolgt: prüfe die Konfiguration der Integration.',
    es: 'Este jugador ya no se sigue: compruebe la configuración de la integración.',
  },
  notReadYet: {
    en: 'This player was not read yet: try again in a minute.',
    fr: "Ce joueur n'a pas encore été lu : réessayez dans une minute.",
    de: 'Dieser Spieler wurde noch nicht gelesen: versuch es in einer Minute erneut.',
    es: 'Este jugador aún no se ha leído: inténtelo de nuevo en un minuto.',
  },
  puzzleUnavailable: {
    en: 'The puzzle of the day cannot be read for now.',
    fr: 'Le problème du jour est illisible pour le moment.',
    de: 'Das Puzzle des Tages kann gerade nicht gelesen werden.',
    es: 'El problema del día no se puede leer por ahora.',
  },
  // Short labels (widget rows, buttons): 24 characters at most.
  lastGame: { en: 'Last game', fr: 'Dernière partie', de: 'Letzte Partie', es: 'Última partida' },
  today: { en: 'Today', fr: "Aujourd'hui", de: 'Heute', es: 'Hoy' },
  status: { en: 'Status', fr: 'État', de: 'Status', es: 'Estado' },
  online: { en: 'Online', fr: 'En ligne', de: 'Online', es: 'En línea' },
  playing: { en: 'In a game', fr: 'En partie', de: 'In einer Partie', es: 'En partida' },
  offline: { en: 'Offline', fr: 'Hors ligne', de: 'Offline', es: 'Desconectado' },
  noGame: {
    en: 'No game yet',
    fr: 'Aucune partie',
    de: 'Noch keine Partie',
    es: 'Ninguna partida',
  },
  profile: { en: 'Profile', fr: 'Profil', de: 'Profil', es: 'Perfil' },
  seeGame: { en: 'Last game', fr: 'Dernière partie', de: 'Letzte Partie', es: 'Última partida' },
  lichessPuzzle: {
    en: 'Lichess puzzle',
    fr: 'Problème Lichess',
    de: 'Lichess-Puzzle',
    es: 'Problema Lichess',
  },
  chesscomPuzzle: {
    en: 'Chess.com puzzle',
    fr: 'Problème Chess.com',
    de: 'Chess.com-Puzzle',
    es: 'Problema Chess.com',
  },
};

/** One text in every language, from a function of the language. */
const all = (build) => Object.fromEntries(LANGUAGES.map((lang) => [lang, build(lang)]));

/** ": ", with the space French puts before it. */
const colon = (lang) => (lang === 'fr' ? ' : ' : ': ');

const signed = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '±0');

/** "1744 −5", "1744", or "" */
function ratingText(game) {
  if (game.rating === null || game.rating === undefined) {
    return '';
  }
  return game.ratingDiff === null || game.ratingDiff === undefined
    ? String(game.rating)
    : `${game.rating} ${signed(game.ratingDiff)}`;
}

/** The time control (or variant) of a game, in a sentence. */
function perfText(game, lang) {
  return CONTROLS[lang][game.perf] ?? (game.perf === 'ultraBullet' ? 'UltraBullet' : game.perf);
}

export const MESSAGES = {
  /** "Win vs Pehachzed (blitz, 1744 −5)" */
  game: (game) =>
    all((lang) => {
      const details = [perfText(game, lang), ratingText(game)].filter(Boolean).join(', ');
      return `${RESULTS[lang][game.result]} ${AGAINST[lang]} ${game.opponent} (${details})`;
    }),

  /** "Win vs Pehachzed": the short form of a widget row (40 characters). */
  gameShort: (game) =>
    all((lang) => `${RESULTS[lang][game.result]} ${AGAINST[lang]} ${game.opponent}`),

  /** "3 games: +2 =1 −0" (wins, draws, losses) */
  today: ({ games, wins, draws, losses }) => {
    const score = `+${wins} =${draws} −${losses}`;
    const word = {
      en: games === 1 ? 'game' : 'games',
      fr: games > 1 ? 'parties' : 'partie',
      de: games === 1 ? 'Partie' : 'Partien',
      es: games === 1 ? 'partida' : 'partidas',
    };
    return all((lang) =>
      games === 0 ? `0 ${word[lang]}` : `${games} ${word[lang]}${colon(lang)}${score}`,
    );
  },

  /** "Blitz 1744" */
  rating: (control, rating) =>
    all((lang) => {
      const name = CONTROLS[lang][control];
      return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${rating}`;
    }),

  /** The sentence of the "Get a chess player" scene action. */
  summary: ({ name, ratings, today, lastGame }) =>
    all((lang) => {
      const parts = [];
      // The three most played time controls: a notification stays short.
      const list = ratings
        .slice(0, 3)
        .map(({ control, rating }) => `${CONTROLS[lang][control]} ${rating}`);
      parts.push(`${name}${list.length ? `${colon(lang)}${list.join(', ')}` : ''}.`);
      parts.push(`${TEXT.today[lang]}${colon(lang)}${MESSAGES.today(today)[lang]}.`);
      if (lastGame) {
        parts.push(`${TEXT.lastGame[lang]}${colon(lang)}${MESSAGES.game(lastGame)[lang]}.`);
      }
      return parts.join(' ');
    }),

  /** "thibault: Win vs Pehachzed (blitz, 1744 −5)" */
  gameEvent: (name, game) => all((lang) => `${name}${colon(lang)}${MESSAGES.game(game)[lang]}`),

  /** "thibault: new blitz record, 1801 (previous best 1790)" */
  recordEvent: (name, control, rating, previous) =>
    all((lang) => {
      const c = CONTROLS[lang][control];
      return {
        en: `${name}: new ${c} record, ${rating} (previous best ${previous})`,
        fr: `${name} : nouveau record en ${c}, ${rating} (précédent ${previous})`,
        de: `${name}: neuer Rekord in ${c}, ${rating} (bisher ${previous})`,
        es: `${name}: nuevo récord en ${c}, ${rating} (anterior ${previous})`,
      }[lang];
    }),

  /** The puzzle of the day, ready for a notification. */
  puzzle: (puzzle) =>
    all((lang) => {
      const brand = PLATFORM_NAMES[puzzle.platform];
      const head = {
        en: `${brand} puzzle of the day`,
        fr: `Problème du jour ${brand}`,
        de: `${brand}-Puzzle des Tages`,
        es: `Problema del día de ${brand}`,
      }[lang];
      const detail = puzzle.title ?? (puzzle.rating ? String(puzzle.rating) : null);
      return `${head}${detail ? ` (${detail})` : ''}${colon(lang)}${puzzle.url}`;
    }),

  /** A line of the "Check the players" action. */
  check: (player) =>
    all((lang) => {
      const who = `${player.name} (${PLATFORM_NAMES[player.platform]})`;
      if (player.notFound) {
        return {
          en: `${who}: no such player`,
          fr: `${who} : joueur introuvable`,
          de: `${who}: Spieler nicht gefunden`,
          es: `${who}: jugador no encontrado`,
        }[lang];
      }
      if (player.error) {
        return {
          en: `${who}: cannot be read (${player.error})`,
          fr: `${who} : lecture impossible (${player.error})`,
          de: `${who}: nicht lesbar (${player.error})`,
          es: `${who}: no se puede leer (${player.error})`,
        }[lang];
      }
      const ratings = player.ratings
        .map(({ control, rating }) => `${CONTROLS[lang][control]} ${rating}`)
        .join(', ');
      return `${who}${colon(lang)}${ratings || TEXT.noGame[lang]}`;
    }),

  /** The usernames that are not usernames, and the ones beyond the limit. */
  ignored: (invalid, dropped) =>
    all((lang) => {
      const lines = [];
      if (invalid.length > 0) {
        lines.push(
          {
            en: `Not a username, ignored: ${invalid.join(', ')}`,
            fr: `Pseudos invalides, ignorés : ${invalid.join(', ')}`,
            de: `Kein gültiger Name, ignoriert: ${invalid.join(', ')}`,
            es: `Usuarios no válidos, ignorados: ${invalid.join(', ')}`,
          }[lang],
        );
      }
      if (dropped.length > 0) {
        lines.push(
          {
            en: `Beyond 10 players per site, not read: ${dropped.join(', ')}`,
            fr: `Au-delà de 10 joueurs par site, non lus : ${dropped.join(', ')}`,
            de: `Mehr als 10 Spieler pro Seite, nicht gelesen: ${dropped.join(', ')}`,
            es: `Más de 10 jugadores por sitio, no leídos: ${dropped.join(', ')}`,
          }[lang],
        );
      }
      return lines.join('\n');
    }),

  /** A thrown error: the core shows it as is, so every language is joined. */
  thrown: (text) => LANGUAGES.map((lang) => text[lang]).join(' / '),
};

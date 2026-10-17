// -----------------------------------------------------------------------------
// Every text Gladys shows exists in the four languages of its interface
// (English, French, German, Spanish): the manifest, the texts of the code and
// the user documentation. German says "du", never the polite "Sie".
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { LANGUAGES } from '../src/config.js';
import { CONTROLS, MESSAGES, NAMES, RESULTS, TEXT } from '../src/i18n.js';

const manifest = JSON.parse(
  await readFile(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);

const LANGS = ['en', 'fr', 'de', 'es'];
const POLITE_GERMAN = /(?<!\p{L})(Sie|Ihr|Ihre|Ihren|Ihrem|Ihrer|Ihres|Ihnen)(?!\p{L})/u;

// Upper bounds, in characters: what the Gladys interface shows without cutting.
const MAX = {
  catalog: 100,
  widgetLabel: 30,
  label: 60,
  placeholder: 60,
  description: 300,
  message: 200,
  short: 40,
  caption: 80,
  featureName: 40,
};

const sorted = (keys) => [...keys].sort();

/** Checks one multi-language object; returns its problems. */
function problems(value, path, max) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [`${path} must be a multi-language object`];
  }
  const found = [];
  if (JSON.stringify(sorted(Object.keys(value))) !== JSON.stringify(sorted(LANGS))) {
    found.push(`${path} has [${Object.keys(value)}], expected exactly [${LANGS}]`);
  }
  for (const [lang, text] of Object.entries(value)) {
    found.push(...textProblems(text, `${path}.${lang}`, lang, max));
  }
  return found;
}

function textProblems(text, path, lang, max) {
  if (typeof text !== 'string' || text.trim() === '') {
    return [`${path} is empty`];
  }
  const found = [];
  if (text.length > max) {
    found.push(`${path} has ${text.length} characters (${max} at most)`);
  }
  if (lang === 'de' && POLITE_GERMAN.test(text)) {
    found.push(`${path} uses the polite form: "${text}"`);
  }
  return found;
}

/** Every multi-language object of the manifest, with its length limit. */
function manifestTexts(root) {
  const texts = [];
  const walk = (value, path, key) => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${path}[${index}]`, key));
      return;
    }
    if (!value || typeof value !== 'object') {
      return;
    }
    const isText =
      ['label', 'description', 'placeholder'].includes(key) ||
      Object.keys(value).some((child) => LANGS.includes(child));
    if (isText) {
      // The store schema caps the catalog and widget descriptions, and widget labels.
      const max =
        path === 'manifest.description' || /^manifest\.widgets\[\d+\]\.description$/.test(path)
          ? MAX.catalog
          : /^manifest\.widgets\[\d+\]\.label$/.test(path)
            ? MAX.widgetLabel
            : (MAX[key] ?? MAX.label);
      texts.push({ path, value, max });
      return;
    }
    for (const [child, item] of Object.entries(value)) {
      walk(item, `${path}.${child}`, child);
    }
  };
  walk(root, 'manifest', null);
  return texts;
}

test('the configuration offers the four languages', () => {
  assert.deepEqual(LANGUAGES, LANGS);
  assert.deepEqual(Object.keys(NAMES), LANGS);
});

test('every text of the manifest is in English, French, German and Spanish', () => {
  const texts = manifestTexts(manifest);
  assert.ok(texts.length >= 60, `only ${texts.length} texts found in the manifest`);
  const found = texts.flatMap(({ path, value, max }) => problems(value, path, max));
  assert.deepEqual(found, []);
});

test('the name is the brand, the same in every language', () => {
  assert.equal(typeof manifest.name, 'string');
  for (const lang of LANGS) {
    assert.ok(manifest.description[lang].length >= 10, `description.${lang} is too short`);
  }
});

test('the feature names, time controls and results exist in every language', () => {
  const found = [];
  for (const [table, values, max] of [
    ['NAMES', NAMES, MAX.featureName],
    ['CONTROLS', CONTROLS, MAX.short],
    ['RESULTS', RESULTS, MAX.short],
  ]) {
    assert.deepEqual(Object.keys(values), LANGS, `${table} languages`);
    for (const lang of LANGS) {
      if (
        JSON.stringify(sorted(Object.keys(values[lang]))) !==
        JSON.stringify(sorted(Object.keys(values.en)))
      ) {
        found.push(`${table}.${lang} does not have the keys of ${table}.en`);
      }
      for (const [key, name] of Object.entries(values[lang])) {
        found.push(...textProblems(name, `${table}.${lang}.${key}`, lang, max));
      }
    }
  }
  assert.deepEqual(found, []);
});

test('the fixed texts exist in every language', () => {
  // Widget rows and buttons: 24 characters (the button label bound of the core).
  const short = new Set([
    'lastGame',
    'today',
    'status',
    'online',
    'playing',
    'offline',
    'noGame',
    'profile',
    'seeGame',
    'lichessPuzzle',
    'chesscomPuzzle',
  ]);
  const found = Object.entries(TEXT).flatMap(([key, value]) =>
    problems(value, `TEXT.${key}`, short.has(key) ? 24 : MAX.message),
  );
  assert.deepEqual(found, []);
});

test('the texts built from values exist in every language', () => {
  const game = {
    result: 'draw',
    opponent: 'A_twenty_five_chars_name_',
    perf: 'correspondence',
    rating: 1744,
    ratingDiff: -5,
  };
  const samples = {
    game: MESSAGES.game({ ...game, perf: 'daily' }),
    variant: MESSAGES.game({ ...game, perf: 'crazyhouse', ratingDiff: null }),
    today: MESSAGES.today({ games: 12, wins: 7, draws: 0, losses: 5 }),
    one: MESSAGES.today({ games: 1, wins: 1, draws: 0, losses: 0 }),
    summary: MESSAGES.summary({
      name: 'thibault (Lichess)',
      ratings: [
        { control: 'blitz', rating: 1744 },
        { control: 'bullet', rating: 1774 },
        { control: 'rapid', rating: 1802 },
        { control: 'classical', rating: 1858 },
        { control: 'daily', rating: 1942 },
        { control: 'puzzle', rating: 1937 },
      ],
      today: { games: 3, wins: 2, draws: 1, losses: 0 },
      lastGame: { ...game, perf: 'blitz' },
    }),
    gameEvent: MESSAGES.gameEvent('thibault (Lichess)', { ...game, perf: 'blitz' }),
    recordEvent: MESSAGES.recordEvent('thibault (Lichess)', 'classical', 1975, 1970),
    lichessPuzzle: MESSAGES.puzzle({
      platform: 'lichess',
      rating: 2108,
      title: null,
      url: 'https://lichess.org/training/iUIdn',
    }),
    chesscomPuzzle: MESSAGES.puzzle({
      platform: 'chesscom',
      title: 'Crash! Bang! gg',
      url: 'https://www.chess.com/daily/2026-10-17',
    }),
    check: MESSAGES.check({
      platform: 'chesscom',
      name: 'Hikaru',
      ratings: [{ control: 'blitz', rating: 3465 }],
    }),
    checkNotFound: MESSAGES.check({ platform: 'lichess', name: 'x', ratings: [], notFound: true }),
    checkError: MESSAGES.check({ platform: 'lichess', name: 'x', ratings: [], error: 'HTTP 503' }),
    ignored: MESSAGES.ignored(['bad/name'], ['eleventh']),
  };
  const found = Object.entries(samples).flatMap(([key, value]) =>
    problems(value, `MESSAGES.${key}`, MAX.message),
  );
  assert.deepEqual(found, []);
  // A widget row: 40 characters at most, even with the longest username.
  for (const lang of LANGS) {
    assert.ok(MESSAGES.gameShort(game)[lang].length <= 40, lang);
    assert.ok(MESSAGES.today({ games: 120, wins: 100, draws: 10, losses: 10 })[lang].length <= 40);
  }
  assert.equal(
    MESSAGES.game({ ...game, perf: 'blitz' }).de,
    'Remis gegen A_twenty_five_chars_name_ (Blitz, 1744 −5)',
  );
  assert.equal(MESSAGES.thrown(TEXT.unknownPlayer).split(' / ').length, 4);
});

test('the guard catches a missing language, an empty text and the polite German form', () => {
  assert.equal(problems({ en: 'Light', fr: 'Éclairage', de: 'Licht' }, 'x', 60).length, 1);
  assert.equal(problems({ en: 'Light', fr: 'Éclairage', de: '', es: 'Luz' }, 'x', 60).length, 1);
  assert.equal(problems({ en: 'a', fr: 'a', de: 'a', es: 'a', it: 'a' }, 'x', 60).length, 1);
  assert.equal(problems({ en: 'a', fr: 'a', de: 'a'.repeat(61), es: 'a' }, 'x', 60).length, 1);
  for (const polite of ['Wählen Sie', 'Ihr Gerät', 'Ihre IP', 'mit Ihrem', 'Ihnen']) {
    assert.equal(problems({ en: 'a', fr: 'a', de: polite, es: 'a' }, 'x', 60).length, 1, polite);
  }
  assert.deepEqual(
    problems({ en: 'a', fr: 'a', de: 'Siebenschläfer, ihre', es: 'a' }, 'x', 60),
    [],
  );
  const forgotten = structuredClone(manifest);
  delete forgotten.scene_triggers[0].fields[0].label.de;
  const found = manifestTexts(forgotten).flatMap(({ path, value, max }) =>
    problems(value, path, max),
  );
  assert.deepEqual(found, [
    'manifest.scene_triggers[0].fields[0].label has [en,fr,es], expected exactly [en,fr,de,es]',
  ]);
});

// --- User documentation --------------------------------------------------------

const docs = Object.fromEntries(
  await Promise.all(
    LANGS.map(async (lang) => [
      lang,
      await readFile(new URL(`../docs/${lang}.md`, import.meta.url), 'utf8'),
    ]),
  ),
);

/** The heading levels of a document, in order ("##", "###"...). */
const outline = (markdown) =>
  markdown
    .split('\n')
    .filter((line) => /^#{1,4} /.test(line))
    .map((line) => line.split(' ')[0]);

test('the four docs exist, long enough for the store, with the same sections', () => {
  for (const lang of LANGS) {
    assert.ok(docs[lang].length >= 300, `docs/${lang}.md is too short for the store`);
    assert.deepEqual(outline(docs[lang]), outline(docs.en), `docs/${lang}.md has other sections`);
  }
  const headings = docs.en.split('\n').filter((line) => line.startsWith('## '));
  for (const section of [
    'What it does',
    'Requirements',
    'Configuration',
    'Devices',
    'Widget',
    'Scenes',
    'Scene examples',
    'Troubleshooting',
    'Limits',
  ]) {
    assert.ok(headings.includes(`## ${section}`), `docs/en.md lacks "## ${section}"`);
  }
});

test('the docs say the integration is not affiliated with Lichess or Chess.com', () => {
  const flat = (text) => text.replace(/\s+/g, ' ');
  assert.match(flat(docs.en), /is not affiliated with Lichess or Chess\.com/);
  assert.match(flat(docs.fr), /n'est affiliée ni à Lichess ni à Chess\.com/);
  assert.match(flat(docs.de), /ist nicht mit Lichess oder Chess\.com verbunden/);
  assert.match(flat(docs.es), /no está afiliada a Lichess ni a Chess\.com/);
  assert.ok(!POLITE_GERMAN.test(docs.de), 'docs/de.md uses the polite form');
});

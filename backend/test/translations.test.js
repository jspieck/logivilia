// English version (audit item 9): translated Logikrätsel, translated names
// in lists, and the seed translations.

process.env.NODE_ENV = 'test';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const createApp = require('../createApp');
const config = require('../config/config');
const { sequelize, Puzzle, User } = require('../models');
const { resetDatabase } = require('../migrator');
const puzzles = require('../puzzles');
const migration = require('../migrations/20261121-04-logical-translations');
const TRANSLATIONS = require('../seed/logicalTranslations.en.json');
const { formalize } = require('../seed/logicalRules');

const app = createApp();
let tools, author, auth;

const german = () => ({
  description: 'Drei Freunde.',
  question: 'Wer hat welches Haustier?',
  clues: ['Anna hat nicht den Hund.', 'Die Katze ist 2 Jahre älter als der Hund.'],
  attributes: [
    { name: 'Name', values: ['Anna', 'Ben', 'Cem'] },
    { name: 'Tier', values: ['Hund', 'Katze', 'Maus'] },
    { name: 'Alter', ordered: 'numeric', values: ['1 Jahr', '3 Jahre', '5 Jahre'] }
  ],
  solution: [['Anna', 'Katze', '3 Jahre'], ['Ben', 'Hund', '1 Jahr'], ['Cem', 'Maus', '5 Jahre']]
});
const english = () => ({
  name: 'Pets',
  description: 'Three friends.',
  question: 'Who has which pet?',
  clues: ['Anna does not have the dog.', 'The cat is 2 years older than the dog.'],
  attributes: [
    { name: 'Name', values: ['Anna', 'Ben', 'Cem'] },
    { name: 'Animal', values: ['Dog', 'Cat', 'Mouse'] },
    { name: 'Age', values: ['1 year', '3 years', '5 years'] }
  ]
});

before(async () => {
  await puzzles.ready;
  tools = await import('../../shared/puzzles/logicalTranslation.js');
  await resetDatabase();
  author = await User.create({ username: 'tina', email: 'tina@example.com', password: 'secret123', role: 'Mitglied', emailVerified: true });
  auth = `Bearer ${jwt.sign({ id: author.id }, config.authentication.jwtSecret)}`;
});
after(() => sequelize.close());

test('the localized copy shows English values and maps answers back', () => {
  const puzzle = { ...german(), translations: { en: english() }, relations: [{ clue: 0, type: 'notSame', a: { attr: 0, value: 'Anna' }, b: { attr: 1, value: 'Hund' } }] };
  const { puzzle: shown, translated, toCanonical, fromCanonical } = tools.localizeLogical(puzzle, 'en');
  assert.equal(translated, true);
  assert.equal(shown.name, 'Pets');
  assert.deepEqual(shown.attributes[1].values, ['Dog', 'Cat', 'Mouse']);
  assert.equal(shown.attributes[2].ordered, 'numeric');
  assert.equal(shown.relations[0].b.value, 'Dog');
  assert.equal(toCanonical(1, 'Cat'), 'Katze');
  assert.equal(fromCanonical(2, '5 Jahre'), '5 years');
  // German players see the original.
  assert.equal(tools.localizeLogical(puzzle, 'de').puzzle, puzzle);
});

test('translations that would break the puzzle are not used', () => {
  // Different numbers in a numeric category: keep the German values.
  const tr = english();
  tr.attributes[2].values = ['one year', '3 years', '5 years'];
  const { puzzle: shown } = tools.localizeLogical({ ...german(), translations: { en: tr } }, 'en');
  assert.deepEqual(shown.attributes[2].values, ['1 Jahr', '3 Jahre', '5 Jahre']);
  assert.deepEqual(shown.attributes[1].values, ['Dog', 'Cat', 'Mouse']);
  // A clue too few (the author edited the puzzle): the whole translation is ignored.
  const short = english();
  short.clues.pop();
  assert.equal(tools.localizeLogical({ ...german(), translations: { en: short } }, 'en').translated, false);
});

test('a translated puzzle is checked in German and lists show its English name', async () => {
  const create = await request(app).post('/api/puzzles').set('Authorization', auth)
    .send({ type: 'logical', name: 'Haustiere', difficulty: 1, ...german(), translations: { en: english() } });
  assert.equal(create.status, 200, JSON.stringify(create.body));
  const id = create.body.id;
  assert.equal(create.body.translations.en.name, 'Pets');

  const list = await request(app).get('/api/puzzles').query({ type: 'logical', page: 1 }).expect(200);
  assert.deepEqual(list.body.items.find(p => p.id === id).names, { en: 'Pets' });

  const solved = await request(app).post(`/api/puzzles/${id}/check`).send({ answer: german().solution }).expect(200);
  assert.equal(solved.body.solved, true);

  const bad = await request(app).post('/api/puzzles').set('Authorization', auth)
    .send({ type: 'logical', name: 'Kaputt', ...german(), translations: { en: { clues: 'nope' } } });
  assert.equal(bad.status, 400);
});

test('editing the German text drops the translation, renaming keeps it', async () => {
  const puzzle = await Puzzle.create({ type: 'logical', name: 'Edit me', UserId: author.id, data: { ...german(), translations: { en: english() } } });
  let res = await request(app).put(`/api/puzzles/${puzzle.id}`).set('Authorization', auth)
    .send({ name: 'Neuer Name', ...german() }).expect(200);
  assert.equal(res.body.translations.en.name, 'Pets');

  res = await request(app).put(`/api/puzzles/${puzzle.id}`).set('Authorization', auth)
    .send({ question: 'Wer hat welches Tier?' }).expect(200);
  assert.equal(res.body.translations, undefined);
  await puzzle.reload();
  assert.equal(puzzle.names, null);
});

test('the migration adds the seed translation to a matching puzzle only', async () => {
  const name = 'Asiatische Lektüre';
  const seed = require('../seed/logicals.json').find(l => l.name === name);
  const data = (formalize(name, seed) || { data: seed }).data;
  const match = await Puzzle.create({ type: 'logical', name, data });
  const edited = await Puzzle.create({ type: 'logical', name, data: { ...data, clues: data.clues.slice(1) } });
  const qi = sequelize.getQueryInterface();
  await migration.up(qi, require('sequelize'));
  await migration.up(qi, require('sequelize')); // idempotent
  await match.reload();
  await edited.reload();
  assert.equal(match.data.translations.en.name, TRANSLATIONS[name].name);
  assert.deepEqual(typeof match.names === 'string' ? JSON.parse(match.names) : match.names, { en: TRANSLATIONS[name].name });
  assert.equal(edited.data.translations, undefined);
});

test('every seed translation fits its puzzle and keeps the numbers', async () => {
  const { orderMode, parseNumber } = await import('../../shared/puzzles/logicalSolver.js');
  const seeds = require('../seed/logicals.json').map(l => (formalize(l.name, l) || { data: l }).data);
  assert.equal(Object.keys(TRANSLATIONS).length, seeds.length);
  for (const data of seeds) {
    const tr = TRANSLATIONS[data.name];
    assert.ok(tr && tools.translationFits(data, tr), data.name);
    assert.equal(tools.translationsProblem({ en: tr }), null, data.name);
    data.attributes.forEach((a, i) => {
      if (orderMode(a) !== 'numeric') return;
      a.values.forEach((v, k) => assert.equal(parseNumber(tr.attributes[i].values[k]), parseNumber(v), `${data.name}: ${v}`));
    });
  }
});

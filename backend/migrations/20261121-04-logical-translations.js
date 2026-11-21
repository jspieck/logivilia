// English version (audit item 9): adds the English texts of the seed
// Logikrätsel (seed/logicalTranslations.en.json) as data.translations.en, and
// the `names` column the overview shows translated names from (kept in step
// by the Puzzle model; see nameTranslations in utils/puzzleView.js).
//
// A puzzle gets a translation only if it is a logical with a seed name, has
// no English translation yet (one an author added stays) and the translation
// still fits it: same clue and value counts (translationFits). Running it
// again changes nothing.
//
// down removes the English translations this migration added and the column.

const { ensureColumn, removeColumnIfExists } = require('./helpers');
const { nameTranslations } = require('../utils/puzzleView');
const TRANSLATIONS = require('../seed/logicalTranslations.en.json');

function parse (data) {
  return typeof data === 'string' ? JSON.parse(data) : data;
}

async function translationTools () {
  return import('../../shared/puzzles/logicalTranslation.js');
}

/** The data with the English translation added, or null if it is left alone. */
async function withTranslation (name, data) {
  const tr = TRANSLATIONS[name];
  if (!tr || !data || !Array.isArray(data.attributes)) return null;
  if (data.translations && data.translations.en) return null;
  const { translationFits } = await translationTools();
  if (!translationFits(data, tr)) return null;
  return { ...data, translations: { ...(data.translations || {}), en: tr } };
}

function withoutTranslation (name, data) {
  const tr = TRANSLATIONS[name];
  if (!tr || !data || !data.translations || JSON.stringify(data.translations.en) !== JSON.stringify(tr)) return null;
  const { en, ...others } = data.translations;
  const { translations, ...rest } = data;
  return Object.keys(others).length ? { ...rest, translations: others } : rest;
}

async function run (qi, direction) {
  const { sequelize } = qi;
  const q = name => qi.quoteIdentifier(name);
  const table = q('Puzzles');
  const names = Object.keys(TRANSLATIONS);
  const rows = await sequelize.query(
    `SELECT ${q('id')}, ${q('name')}, ${q('data')} FROM ${table} WHERE ${q('type')} = 'logical' AND ${q('name')} IN (?)`,
    { replacements: [names], type: sequelize.QueryTypes.SELECT }
  );
  await sequelize.transaction(async transaction => {
    for (const row of rows) {
      const data = parse(row.data);
      const changed = direction === 'up' ? await withTranslation(row.name, data) : withoutTranslation(row.name, data);
      if (!changed) continue;
      await sequelize.query(
        `UPDATE ${table} SET ${q('data')} = ? WHERE ${q('id')} = ?`,
        { replacements: [JSON.stringify(changed), row.id], transaction }
      );
    }
  });
}

/** Fills `names` for every puzzle from its data.translations. */
async function backfillNames (qi) {
  const { sequelize } = qi;
  const q = name => qi.quoteIdentifier(name);
  const rows = await sequelize.query(
    `SELECT ${q('id')}, ${q('data')} FROM ${q('Puzzles')}`,
    { type: sequelize.QueryTypes.SELECT }
  );
  await sequelize.transaction(async transaction => {
    for (const row of rows) {
      const names = nameTranslations(row);
      if (!names) continue;
      await sequelize.query(
        `UPDATE ${q('Puzzles')} SET ${q('names')} = ? WHERE ${q('id')} = ?`,
        { replacements: [JSON.stringify(names), row.id], transaction }
      );
    }
  });
}

module.exports = {
  withTranslation,
  backfillNames,

  async up (qi, Sequelize) {
    await ensureColumn(qi, 'Puzzles', 'names', { type: Sequelize.JSON, allowNull: true });
    await run(qi, 'up');
    await backfillNames(qi);
  },

  async down (qi) {
    await run(qi, 'down');
    await removeColumnIfExists(qi, 'Puzzles', 'names');
  }
};

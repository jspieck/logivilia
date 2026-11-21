// Translations of a Logikrätsel (data.translations), and the display copy a
// player in another language sees.
//
// data.translations: { [locale]: { name?, description?, question?, clues?,
//   attributes?: [{ name?, values? }] } }, in the same order as the German
// original. The German values stay the truth: the solution, the formal rules
// and saved games use them, so the browser shows the translated value at the
// same position and maps the player's answer back (toCanonical).
//
// A translated value is only used where it keeps the puzzle working: a
// numeric category must read as the same numbers, an alphabetical one keeps
// its German values (their order is part of the clues), and all values of a
// category must stay distinct. A translation that no longer fits the puzzle's
// shape (the author edited it) is ignored as a whole.

import { orderMode, parseNumber } from './logicalSolver.js';

export const MAX_TRANSLATION_CHARS = 50000;

const isStr = v => typeof v === 'string';

/** Why a data.translations value is not acceptable, or null. */
export function translationsProblem (translations) {
  if (translations == null) return null;
  if (typeof translations !== 'object' || Array.isArray(translations)) return 'translations must be an object';
  if (JSON.stringify(translations).length > MAX_TRANSLATION_CHARS) return 'translations are too long';
  for (const [locale, tr] of Object.entries(translations)) {
    if (!/^[a-z]{2}$/.test(locale)) return 'translations must be keyed by a two-letter language code';
    if (!tr || typeof tr !== 'object' || Array.isArray(tr)) return 'each translation must be an object';
    for (const key of ['name', 'description', 'question']) {
      if (tr[key] != null && !isStr(tr[key])) return `translation ${key} must be text`;
    }
    if (tr.clues != null && !(Array.isArray(tr.clues) && tr.clues.every(isStr))) return 'translation clues must be a list of texts';
    if (tr.attributes != null && !(Array.isArray(tr.attributes) && tr.attributes.every(a =>
      a && typeof a === 'object' && (a.name == null || isStr(a.name)) &&
      (a.values == null || (Array.isArray(a.values) && a.values.every(isStr)))))) {
      return 'translation attributes must be a list of { name, values }';
    }
  }
  return null;
}

/** Does translation `tr` have the shape of the puzzle (same clue and value counts)? */
export function translationFits (data, tr) {
  if (!tr || typeof tr !== 'object') return false;
  const clues = Array.isArray(data.clues) ? data.clues : [];
  const attributes = Array.isArray(data.attributes) ? data.attributes : [];
  if (tr.clues != null && (!Array.isArray(tr.clues) || tr.clues.length !== clues.length)) return false;
  if (tr.attributes != null) {
    if (!Array.isArray(tr.attributes) || tr.attributes.length !== attributes.length) return false;
    if (!tr.attributes.every((a, i) => !a || a.values == null ||
      (Array.isArray(a.values) && a.values.length === attributes[i].values.length))) return false;
  }
  return true;
}

/** The translated values of one category, or null to keep the German ones. */
function usableValues (attribute, values) {
  if (!Array.isArray(values)) return null;
  const original = attribute.values.map(String);
  const translated = values.map(String);
  if (translated.every((v, i) => v === original[i])) return null;
  const mode = orderMode(attribute);
  if (mode === 'alpha') return null;
  if (mode === 'numeric' && translated.some((v, i) => parseNumber(v) !== parseNumber(original[i]))) return null;
  // Distinct where the original is (some old puzzles repeat a value).
  const distinct = new Set(original).size;
  if (new Set(translated).size !== distinct) return null;
  return translated;
}

const identity = (attr, value) => value;

/**
 * The puzzle as a player using `locale` sees it, plus mappers between the
 * shown values and the German ones the server knows.
 * @param {any} puzzle a public logical (publicPuzzle: data fields flattened in)
 * @param {string} locale
 * @returns {{ puzzle: any, translated: boolean,
 *   toCanonical: (attr: number, value: any) => any,
 *   fromCanonical: (attr: number, value: any) => any }}
 */
export function localizeLogical (puzzle, locale) {
  const tr = puzzle && puzzle.translations && puzzle.translations[locale];
  if (!tr || !translationFits(puzzle, tr)) {
    return { puzzle, translated: false, toCanonical: identity, fromCanonical: identity };
  }
  const maps = (puzzle.attributes || []).map((attribute, i) => {
    const values = usableValues(attribute, tr.attributes?.[i]?.values);
    if (!values) return null;
    const original = attribute.values.map(String);
    return {
      values,
      toGerman: new Map(values.map((v, k) => [v, original[k]])),
      toLocal: new Map(original.map((v, k) => [v, values[k]]))
    };
  });
  const fromCanonical = (attr, value) => {
    const map = maps[attr];
    if (!map || value == null) return value;
    return map.toLocal.get(String(value)) ?? value;
  };
  const toCanonical = (attr, value) => {
    const map = maps[attr];
    if (!map || value == null) return value;
    return map.toGerman.get(String(value)) ?? value;
  };
  const ref = r => (r && Number.isInteger(r.attr) && r.value !== undefined ? { ...r, value: fromCanonical(r.attr, r.value) } : r);
  const relation = rel => {
    const out = { ...rel };
    for (const key of ['a', 'b', 'c']) if (out[key]) out[key] = ref(out[key]);
    if (Array.isArray(out.rules)) out.rules = out.rules.map(relation);
    return out;
  };
  const text = (key) => (isStr(tr[key]) && tr[key].trim() ? tr[key] : puzzle[key]);
  const localized = {
    ...puzzle,
    name: text('name'),
    description: text('description'),
    question: text('question'),
    clues: Array.isArray(tr.clues) ? tr.clues.map((c, i) => (c.trim() ? c : puzzle.clues[i])) : puzzle.clues,
    attributes: (puzzle.attributes || []).map((attribute, i) => ({
      ...attribute,
      name: (isStr(tr.attributes?.[i]?.name) && tr.attributes[i].name.trim()) || attribute.name,
      values: maps[i] ? maps[i].values : attribute.values
    }))
  };
  if (Array.isArray(puzzle.relations)) localized.relations = puzzle.relations.map(relation);
  return { puzzle: localized, translated: true, toCanonical, fromCanonical };
}

/** The name of any puzzle in `locale`: data.translations[locale].name, else its own. */
export function translatedName (name, translations, locale) {
  const t = translations && translations[locale] && translations[locale].name;
  return isStr(t) && t.trim() ? t : name;
}

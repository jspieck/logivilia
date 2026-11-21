// A puzzle's name in the language the site is shown in. Lists send
// `names: { [locale]: name }` (the Puzzle `names` column); a full puzzle has
// data.translations[locale].name instead. Untranslated puzzles keep their name.

import { useI18n } from 'vue-i18n'

export function localName (puzzle, locale) {
  if (!puzzle) return ''
  const name = puzzle.names?.[locale] || puzzle.translations?.[locale]?.name
  return typeof name === 'string' && name.trim() ? name : puzzle.name
}

/** (puzzle) => its name in the current locale (reactive inside templates). */
export function usePuzzleName () {
  const { locale } = useI18n()
  return puzzle => localName(puzzle, locale.value)
}

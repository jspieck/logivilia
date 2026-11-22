// A formal Logikrätsel rule (shared/puzzles/logicalSolver.js) as a sentence,
// for the admin view and for rules the editor cannot build with its
// dropdowns (groups, sums, totals). `t` is vue-i18n's translate function.

const isNumberLike = text => /^\s*[-\d.,:]+\s*\S{0,2}\s*$/.test(String(text))

/** How a value is named: its text, with the category if that is unclear. */
export function valueLabel (ref, attributes) {
  if (ref && typeof ref.var === 'string') return ref.var
  const attribute = attributes[ref?.attr]
  if (!attribute) return '?'
  const text = String(ref.value).trim()
  const elsewhere = attributes.some((a, i) => i !== ref.attr && a.values.some(v => String(v).trim() === text))
  return elsewhere || isNumberLike(text) ? `${attribute.name.trim()} ${text}` : text
}

/**
 * @param {any} rule
 * @param {{ name: string, values: string[] }[]} attributes
 * @param {(key: string, params?: object) => string} t
 * @returns {string}
 */
export function describeRule (rule, attributes, t) {
  const v = ref => valueLabel(ref, attributes)
  const cat = attributes[rule.by]?.name?.trim() || '?'
  const sub = rules => rules.map(r => describeRule(r, attributes, t))
  const params = { a: v(rule.a), b: v(rule.b), c: rule.c ? v(rule.c) : '', cat }
  switch (rule.type) {
    case 'anyOf': return t('logicalRules.anyOf', { list: sub(rule.rules).map(s => `(${s})`).join(` ${t('logicalRules.or')} `) })
    case 'allOf': return sub(rule.rules).join(` ${t('logicalRules.and')} `)
    case 'exists': return t('logicalRules.exists', { x: rule.var, list: sub(rule.rules).join(` ${t('logicalRules.and')} `) })
    case 'not': return t('logicalRules.not', { rule: sub(rule.rules)[0] })
    case 'note': return t('logicalRules.note')
    case 'differsBy': {
      const n = Math.abs(rule.offset)
      if (rule.abs) return t('logicalRules.differsByAbs', { ...params, n })
      return t(rule.offset > 0 ? 'logicalRules.differsByMore' : 'logicalRules.differsByLess', { ...params, n })
    }
    case 'times': return t('logicalRules.times', { ...params, n: rule.factor })
    case 'total': {
      const cats = (rule.over || []).map(c => attributes[c]?.name?.trim() || '?').join(' + ')
      const offset = rule.offset || 0
      if (rule.value !== undefined) return t('logicalRules.total', { a: params.a, cats, target: String(rule.value + offset) })
      const other = rule.extreme ? t(rule.extreme === 'min' ? 'logicalRules.totalMin' : 'logicalRules.totalMax') : params.b
      const key = offset > 0 ? 'logicalRules.totalMore' : offset < 0 ? 'logicalRules.totalLess' : 'logicalRules.totalEqual'
      return t('logicalRules.total', { a: params.a, cats, target: t(key, { n: Math.abs(offset), other }) })
    }
    default: return t(`logicalRules.${rule.type}`, params)
  }
}

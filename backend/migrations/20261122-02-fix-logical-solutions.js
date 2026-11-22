// Seed Logikrätsel whose clues contradicted their stored solution. Mostly the
// solution was wrong (the clues as written have exactly one solution, and it
// was not the stored one), once a clue. Checked with the solver and by
// solving them by hand.
//
//   Lieblingsdichter  Beate and Martin were swapped: Beate is Brecht, 40,
//                     likes Brecht and reads 4 poems; Martin is Jung, 30,
//                     likes Göthe and reads 1.
//   Stricken auf Zeit Peter and Uta were swapped: Peter is Steif, 50, with
//                     6 titles; Uta is Severin, 30, with 5. Clue 6 said
//                     "Platz 5" but means 5 titles; its text (German and
//                     English) now says so.
//   Fleischhasser     Amalie and Marvin were swapped: Amalie is Wotzek, the
//   unter sich        pescetarian of 20 years; Marvin is Hitz, the
//                     fructarian of 15. The category "Seit" is now "Jahre"
//                     ("Years") with its values in order 5, 10, 15, 20.
//   Baum des Jahres   heights and seasons were wrong: Ahorn 40 m (Frühling),
//                     Birke 46 m, Buche 52 m (Herbst), Linde 34 m (Winter).
//   Kaninchenzucht    the ages were wrong: Antje 55, Fridolin 65, Gertje 60,
//                     Roman 80. Clue 2 now says "ohne Rest teilbar"
//                     ("evenly divisible").
//   Erfreuliche       the solution was right, clue 4 wrong: Marlen is four
//   Pilzsuche         years older (not younger) than Leander. Clue 3 ("Marie
//                     ist nicht 38") was not needed; it is now "Isabell hat
//                     die meisten Pilze gefunden", so the puzzle can be
//                     solved without trying things out.
//   Hüttenbesuch      the room counts of Ines and Reinhold were swapped
//                     (Ines 10, Reinhold 8), and the clues had three
//                     solutions: new clue 17 "Ines trinkt Ingwerlimonade".
//   Lieferantenchaos  the waggon counts could all move by 20: new clue 5
//                     "Bobby lieferte mit den wenigsten Waggons an"; clue 2
//                     was missing an "als".
//   Italienische      six solutions: new clue 6 "Angelo stammt aus Neapel".
//   Genüsse           Also "Enrico" -> "Enno" (clue 2), "Hotels" ->
//                     "Restaurants" (clue 4), "berühmte" in the question and
//                     the years without the stray space, in order.
//
// Because the clues contradicted the old solution, migration 20261116-01 left
// out the rules of those clues (`newRuleClues`, 0-based), so players saw no
// rule chips under them. With the right solution every clue gets its rules.
//
// A puzzle is only changed if it is a logical with that name whose solution
// and changed clues are still exactly the old ones and whose rules all fit
// the new solution, so an edited or user puzzle with the same name is left
// alone. An English clue or category is only changed if it is still the old
// one.
// Running it again changes nothing; down restores the old solution and clue
// texts and drops the added rules.

const { withRules } = require('./20261116-01-logical-rules')

const FIXES = [
  {
    name: 'Lieblingsdichter',
    from: [
      ['Beate', 'Jung', '30', 'Göthe', '1'],
      ['Ilse', 'Imminger', '50', 'Schiller', '3'],
      ['Martin', 'Brecht', '40', 'Brecht', '4'],
      ['Steve', 'Anger', '60', 'Eichendorff', '5']
    ],
    to: [
      ['Beate', 'Brecht', '40', 'Brecht', '4'],
      ['Ilse', 'Imminger', '50', 'Schiller', '3'],
      ['Martin', 'Jung', '30', 'Göthe', '1'],
      ['Steve', 'Anger', '60', 'Eichendorff', '5']
    ],
    newRuleClues: [2, 4]
  },
  {
    name: 'Stricken auf Zeit',
    from: [
      ['Bertha', 'Wanda', '20', '3'],
      ['Ivonne', 'Marix', '40', '4'],
      ['Peter', 'Severin', '30', '5'],
      ['Uta', 'Steif', '50', '6']
    ],
    to: [
      ['Bertha', 'Wanda', '20', '3'],
      ['Ivonne', 'Marix', '40', '4'],
      ['Peter', 'Steif', '50', '6'],
      ['Uta', 'Severin', '30', '5']
    ],
    newRuleClues: [3, 4],
    // clue index: [old text, new text]
    clues: { 5: ['Die 50 jährige Person belegt nicht Platz 5.', 'Die 50 jährige Person hat nicht 5 Titel.'] },
    cluesEn: { 5: ['The 50-year-old person does not take 5th place.', 'The 50-year-old person does not have 5 wins.'] }
  },
  {
    name: 'Fleischhasser unter sich',
    from: [
      ['Amalie', 'Hitz', 'Fructarier', '15'],
      ['Frederike', 'Ulo', 'Vegan', '5'],
      ['Marvin', 'Wotzek', 'Pescetarier', '20'],
      ['Till', 'Mall', 'Vegetarier', '10']
    ],
    to: [
      ['Amalie', 'Wotzek', 'Pescetarier', '20'],
      ['Frederike', 'Ulo', 'Vegan', '5'],
      ['Marvin', 'Hitz', 'Fructarier', '15'],
      ['Till', 'Mall', 'Vegetarier', '10']
    ],
    newRuleClues: [1],
    // category index: [old, new] (name and values in their order)
    attributes: {
      3: [{ name: 'Seit', values: ['10', '15', '20', '5'] }, { name: 'Jahre', values: ['5', '10', '15', '20'] }]
    },
    attributesEn: {
      3: [{ name: 'Duration', values: ['10', '15', '20', '5'] }, { name: 'Years', values: ['5', '10', '15', '20'] }]
    }
  },
  {
    name: 'Baum des Jahres',
    from: [
      ['Ahorn', '34', 'Witzek', 'Winter'],
      ['Birke', '40', 'Marn', 'Sommer'],
      ['Buche', '46', 'Fenn', 'Frühling'],
      ['Linde', '52', 'Arndt', 'Herbst']
    ],
    to: [
      ['Ahorn', '40', 'Witzek', 'Frühling'],
      ['Birke', '46', 'Fenn', 'Sommer'],
      ['Buche', '52', 'Arndt', 'Herbst'],
      ['Linde', '34', 'Marn', 'Winter']
    ],
    newRuleClues: [4]
  },
  {
    name: 'Kaninchenzucht',
    from: [
      ['Antje', '80', '2'],
      ['Fridolin', '55', '4'],
      ['Gertje', '65', '5'],
      ['Hanna', '70', '3'],
      ['Roman', '60', '1']
    ],
    to: [
      ['Antje', '55', '2'],
      ['Fridolin', '65', '4'],
      ['Gertje', '60', '5'],
      ['Hanna', '70', '3'],
      ['Roman', '80', '1']
    ],
    newRuleClues: [0],
    clues: {
      1: [
        'Fridolin ist jünger als Hanna, deren Alter nicht durch die Zahl der Kaninchen teilbar ist, die Fridolin dieses Jahr abgegeben hat',
        'Fridolin ist jünger als Hanna, deren Alter nicht ohne Rest durch die Zahl der Kaninchen teilbar ist, die Fridolin dieses Jahr abgegeben hat.'
      ]
    },
    cluesEn: {
      1: [
        'Fridolin is younger than Hanna, whose age is not divisible by the number of rabbits that Fridolin has given away this year.',
        'Fridolin is younger than Hanna, whose age is not evenly divisible by the number of rabbits that Fridolin has given away this year.'
      ]
    }
  },
  {
    name: 'Erfreuliche Pilzsuche',
    from: [
      ['Daniel', 'Ulbricht', '30', '6'],
      ['Isabell', 'Marlen', '38', '10'],
      ['Leander', 'Bern', '34', '8'],
      ['Marie', 'Maler', '42', '4']
    ],
    to: [
      ['Daniel', 'Ulbricht', '30', '6'],
      ['Isabell', 'Marlen', '38', '10'],
      ['Leander', 'Bern', '34', '8'],
      ['Marie', 'Maler', '42', '4']
    ],
    newRuleClues: [2, 3],
    // The rule clue 3 had before (down puts it back).
    oldRules: [{ clue: 2, type: 'notSame', a: { attr: 0, value: 'Marie' }, b: { attr: 2, value: '38' } }],
    clues: {
      2: ['Marie ist nicht 38 Jahre alt.', 'Isabell hat die meisten Pilze gefunden.'],
      3: [
        'Der stolze Finder mit dem Namen Marlen ist vier Jahre jünger als Leander.',
        'Der stolze Finder mit dem Namen Marlen ist vier Jahre älter als Leander.'
      ]
    },
    cluesEn: {
      2: ['Marie is not 38 years old.', 'Isabell found the most mushrooms.'],
      3: [
        'The proud finder with the name Marlen is four years younger than Leander.',
        'The proud finder with the name Marlen is four years older than Leander.'
      ]
    }
  },
  {
    name: 'Hüttenbesuch',
    from: [
      ['Andrea', 'Messner', 'Stuttgarter-Hütte', 'Wurstsalat', 'Helles', '4'],
      ['Edmund', 'Papert', 'Bad-Kissinger-Hütte', 'Penne Arrabiata', 'Weißbier', '5'],
      ['Erwin', 'Ehses', 'Karwendelhaus', 'Gemüse-Curry', 'Johannisbeerschorle', '6'],
      ['Ines', 'Hillary', 'Willers-Alpe', 'Schnitzel', 'Ingwerlimonade', '8'],
      ['Reinhold', 'Volz', 'Kemptener-Hütte', 'Tofu-Würstchen', 'Ski-Wasser', '10']
    ],
    to: [
      ['Andrea', 'Messner', 'Stuttgarter-Hütte', 'Wurstsalat', 'Helles', '4'],
      ['Edmund', 'Papert', 'Bad-Kissinger-Hütte', 'Penne Arrabiata', 'Weißbier', '5'],
      ['Erwin', 'Ehses', 'Karwendelhaus', 'Gemüse-Curry', 'Johannisbeerschorle', '6'],
      ['Ines', 'Hillary', 'Willers-Alpe', 'Schnitzel', 'Ingwerlimonade', '10'],
      ['Reinhold', 'Volz', 'Kemptener-Hütte', 'Tofu-Würstchen', 'Ski-Wasser', '8']
    ],
    newRuleClues: [5, 12, 16],
    clues: { 16: [null, 'Ines trinkt Ingwerlimonade.'] },
    cluesEn: { 16: [null, 'Ines drinks ginger lemonade.'] }
  },
  {
    name: 'Lieferantenchaos',
    from: [
      ['Alan', 'Ziegel', 'Dienstag', '100'],
      ['Bobby', 'Holz', 'Mittwoch', '40'],
      ['Lucy', 'Glas', 'Freitag', '120'],
      ['Mizuki', 'Schotter', 'Donnerstag', '80'],
      ['Sam', 'Stahl', 'Montag', '60']
    ],
    to: [
      ['Alan', 'Ziegel', 'Dienstag', '100'],
      ['Bobby', 'Holz', 'Mittwoch', '40'],
      ['Lucy', 'Glas', 'Freitag', '120'],
      ['Mizuki', 'Schotter', 'Donnerstag', '80'],
      ['Sam', 'Stahl', 'Montag', '60']
    ],
    newRuleClues: [4],
    clues: {
      1: [
        'Alan kam 2 Tage vor dem Schotterlieferanten an und hatte 20 Waggons weniger Lucy.',
        'Alan kam 2 Tage vor dem Schotterlieferanten an und hatte 20 Waggons weniger als Lucy.'
      ],
      4: [
        null,
        'Bobby lieferte mit den wenigsten Waggons an.'
      ]
    },
    cluesEn: {
      4: [
        null,
        'Bobby delivered the fewest wagons.'
      ]
    }
  },
  {
    name: 'Italienische Genüsse',
    from: [
      ['Angelo', 'Neapel', 'Fusilli', 'Napoli', '2002'],
      ['Antonio', 'Pisa', 'Tagliatelle', 'Vier-Käse', '2000'],
      ['Enno', 'Florenz', 'Spaghetti', 'Funghi', ' 2004'],
      ['Marcella', 'Rom', 'Tortellini', 'Margherita', '2006']
    ],
    to: [
      ['Angelo', 'Neapel', 'Fusilli', 'Napoli', '2002'],
      ['Antonio', 'Pisa', 'Tagliatelle', 'Vier-Käse', '2000'],
      ['Enno', 'Florenz', 'Spaghetti', 'Funghi', '2004'],
      ['Marcella', 'Rom', 'Tortellini', 'Margherita', '2006']
    ],
    newRuleClues: [5],
    clues: {
      1: [
        'Enrico bereitet nach eigener Aussage eine extraordinäre Pizza Funghi zu und eröffnete sein Restaurant 2 Jahre früher als der Koch aus Rom.',
        'Enno bereitet nach eigener Aussage eine extraordinäre Pizza Funghi zu und eröffnete sein Restaurant 2 Jahre früher als der Koch aus Rom.'
      ],
      3: [
        'Der Küchenbegeisterte aus Neapel feierte die Eröffnung seines Hotels 2 Jahre nach dem Tagliatelle-Koch und 2 Jahre vor dem Spaghetti-Koch, der nicht aus Rom stammt.',
        'Der Küchenbegeisterte aus Neapel feierte die Eröffnung seines Restaurants 2 Jahre nach dem Tagliatelle-Koch und 2 Jahre vor dem Spaghetti-Koch, der nicht aus Rom stammt.'
      ],
      5: [
        null,
        'Angelo stammt aus Neapel.'
      ]
    },
    cluesEn: {
      1: [
        'Enrico says he prepares an extraordinary Funghi pizza, and he opened his restaurant 2 years earlier than the chef from Rome.',
        'Enno says he prepares an extraordinary Funghi pizza, and he opened his restaurant 2 years earlier than the chef from Rome.'
      ],
      3: [
        'The enthusiastic cook from Naples celebrated the opening of his hotel 2 years after the tagliatelle chef and 2 years before the spaghetti chef, who does not come from Rome.',
        'The enthusiastic cook from Naples celebrated the opening of his restaurant 2 years after the tagliatelle chef and 2 years before the spaghetti chef, who does not come from Rome.'
      ],
      5: [
        null,
        'Angelo comes from Naples.'
      ]
    },
    attributes: {
      4: [{ name: 'Eröffnung', values: [' 2004', '2000', '2002', '2006'] }, { name: 'Eröffnung', values: ['2000', '2002', '2004', '2006'] }]
    },
    attributesEn: {
      4: [{ name: 'Opening', values: [' 2004', '2000', '2002', '2006'] }, { name: 'Opening', values: ['2000', '2002', '2004', '2006'] }]
    },
    question: [
      'Wer (Vorname) stammt aus welcher italienischen Stadt, führt sein Restaurant schon wie lange und was ist die berühmt Pizza- und Pastasorte des jeweiligen Restaurants?',
      'Wer (Vorname) stammt aus welcher italienischen Stadt, führt sein Restaurant schon wie lange und was ist die berühmte Pizza- und Pastasorte des jeweiligen Restaurants?'
    ]
  }
]

function parse (data) {
  return typeof data === 'string' ? JSON.parse(data) : data
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// The clue list with each changed clue at `side` (0 old, 1 new), or null if
// a clue does not have the other side's text.
// A text of null means "no clue there": a clue added at the end has null as
// its old text (and the clue list must end there).
function swapClues (clues, changes = {}, side) {
  if (!Array.isArray(clues)) return Object.keys(changes).length ? null : clues
  const result = [...clues]
  for (const [i, texts] of Object.entries(changes)) {
    if (texts[1 - side] === null ? result.length !== Number(i) : result[i] !== texts[1 - side]) return null
    result[i] = texts[side]
  }
  while (result.length && result[result.length - 1] === null) result.pop()
  return result
}

// The categories with each changed one at `side` (name and values; other
// fields such as `ordered` are kept), or null if one is not the other side's.
function swapAttributes (attributes, changes = {}, side) {
  if (!Array.isArray(attributes)) return Object.keys(changes).length ? null : attributes
  const result = [...attributes]
  for (const [i, pair] of Object.entries(changes)) {
    const a = result[i]
    if (!a || !same({ name: a.name, values: a.values }, pair[1 - side])) return null
    result[i] = { ...a, ...pair[side] }
  }
  return result
}

// The English translation with its changed clues and categories swapped;
// a part that is not the expected one (an author's own) is kept as it is.
function swapTranslation (translations, fix, side) {
  const en = translations && translations.en
  if (!en) return translations
  const next = { ...en }
  const clues = fix.cluesEn && swapClues(en.clues, fix.cluesEn, side)
  if (clues) next.clues = clues
  const attributes = fix.attributesEn && swapAttributes(en.attributes, fix.attributesEn, side)
  if (attributes) next.attributes = attributes
  return { ...translations, en: next }
}

/** The fixed data, or null if the puzzle is left alone. */
async function applyFix (fix, data) {
  if (!data || !Array.isArray(data.attributes) || !same(data.solution, fix.from)) return null
  const clues = swapClues(data.clues, fix.clues, 1)
  const attributes = swapAttributes(data.attributes, fix.attributes, 1)
  if (!clues || !attributes || (fix.question && data.question !== fix.question[0])) return null
  const { rules, ...rest } = data
  const plain = {
    ...rest,
    attributes: attributes.map(({ ordered, ...attribute }) => attribute),
    clues,
    solution: fix.to
  }
  if (fix.question) plain.question = fix.question[1]
  if (rest.translations) plain.translations = swapTranslation(rest.translations, fix, 1)
  return withRules(fix.name, plain)
}

/** The data with the fix undone, or null if it is left alone. */
function undoFix (fix, data) {
  if (!data || !same(data.solution, fix.to)) return null
  const clues = swapClues(data.clues, fix.clues, 0)
  const attributes = swapAttributes(data.attributes, fix.attributes, 0)
  if (!clues || !attributes || (fix.question && data.question !== fix.question[1])) return null
  const rules = (data.rules || []).filter(rule => !fix.newRuleClues.includes(rule.clue))
    .concat(fix.oldRules || [])
    .sort((a, b) => a.clue - b.clue)
  const undone = { ...data, attributes, clues, solution: fix.from, rules }
  if (fix.question) undone.question = fix.question[0]
  if (data.translations) undone.translations = swapTranslation(data.translations, fix, 0)
  return undone
}

async function run (qi, direction) {
  const { sequelize } = qi
  const table = qi.quoteIdentifier('Puzzles')
  const q = name => qi.quoteIdentifier(name)
  const rows = await sequelize.query(
    `SELECT ${q('id')}, ${q('name')}, ${q('data')} FROM ${table} WHERE ${q('type')} = 'logical' AND ${q('name')} IN (?)`,
    { replacements: [FIXES.map(fix => fix.name)], type: sequelize.QueryTypes.SELECT }
  )
  const updates = []
  for (const row of rows) {
    const fix = FIXES.find(f => f.name === row.name)
    const data = parse(row.data)
    const changed = direction === 'up' ? await applyFix(fix, data) : undoFix(fix, data)
    if (changed) updates.push([row.id, changed])
  }
  await sequelize.transaction(async transaction => {
    for (const [id, data] of updates) {
      await sequelize.query(
        `UPDATE ${table} SET ${q('data')} = ? WHERE ${q('id')} = ?`,
        { replacements: [JSON.stringify(data), id], transaction }
      )
    }
  })
}

module.exports = {
  FIXES,
  applyFix,
  undoFix,

  async up (qi) {
    await run(qi, 'up')
  },

  async down (qi) {
    await run(qi, 'down')
  }
}

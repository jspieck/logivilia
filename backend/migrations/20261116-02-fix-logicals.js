// Three seed Logikrätsel had broken data (found by formalising their clues,
// see seed/logicalRules.js):
//
//   Asiatische Lektüre  the clues contradicted each other and the stored
//                       solution. Clue 4 now says Issos book costs 2€ more
//                       (not 1€ less) than Umabes; the solution is the one
//                       solution of the clues.
//   Kunstfertige Tiere  the clues had two solutions (Andreas and Theodor
//                       could swap grades 4 and 6). Clue 8 settles it; the
//                       solution stays.
//   Werdende Köche      the solution named Mal and Rat twice and Sun and Tre
//                       not at all. Also typos in clues 1 and 3, and the
//                       last "clue" (how to type the answer) is removed.
//
// A puzzle is only changed if it is a logical with that name whose clues and
// solution are still exactly the old ones, so an edited or user puzzle with
// the same name is left alone. Afterwards it gets its formal rules (as in
// 20261116-01) if they fit. Running it again changes nothing; down restores
// the old clues and solution and drops the rules.

const { withRules } = require('./20261116-01-logical-rules')

const FIXES = [
  {
    name: 'Asiatische Lektüre',
    from: {
      clues: [
        'Das Buch “Zen Buddhismus” kostet zu einem Normalpreis 2€ mehr als das Buch “Qi” und besitzt zudem 5 Seiten mehr oder weniger als das Buch des Autors Nguyen, welcher aber nicht das Buch Qi verfasst hat.',
        'Das Buch des Autors Takeda kostet laut unverbindlicher Preisempfehlung 5€ und schildert einen Aspekt Asiens 5 Seiten umfangreicher als das Buch von Suzuki.',
        '“Asiens Seen” kann man 1€ billiger erwerben als das 120 Seiten umfassende Buch.',
        'Issos Werk hat 5 Seiten weniger als das Buch “Thai Food” und kostet außerdem 1€ weniger als Umabes Buch.',
        '“Thai Food” ist teurer als das Buch “Asiens Inseln”, das 100 Seiten umfasst.'
      ],
      solution: [
        [
          'Asiens Inseln',
          'Nguyen',
          '105',
          '8€'
        ],
        [
          'Asiens Seen',
          'Isso',
          '80',
          '6€'
        ],
        [
          'Thai Food',
          'Suzuki',
          '85',
          '9€'
        ],
        [
          'Qi',
          'Umabe',
          '120',
          '7€'
        ],
        [
          'Zen Buddhismus',
          'Takeda',
          '100',
          '5€'
        ]
      ]
    },
    to: {
      clues: [
        'Das Buch “Zen Buddhismus” kostet zu einem Normalpreis 2€ mehr als das Buch “Qi” und besitzt zudem 5 Seiten mehr oder weniger als das Buch des Autors Nguyen, welcher aber nicht das Buch Qi verfasst hat.',
        'Das Buch des Autors Takeda kostet laut unverbindlicher Preisempfehlung 5€ und schildert einen Aspekt Asiens 5 Seiten umfangreicher als das Buch von Suzuki.',
        '“Asiens Seen” kann man 1€ billiger erwerben als das 120 Seiten umfassende Buch.',
        'Issos Werk hat 5 Seiten weniger als das Buch “Thai Food” und kostet außerdem 2€ mehr als Umabes Buch.',
        '“Thai Food” ist teurer als das Buch “Asiens Inseln”, das 100 Seiten umfasst.'
      ],
      solution: [
        [
          'Asiens Inseln',
          'Suzuki',
          '100',
          '7€'
        ],
        [
          'Asiens Seen',
          'Takeda',
          '105',
          '5€'
        ],
        [
          'Thai Food',
          'Nguyen',
          '85',
          '9€'
        ],
        [
          'Qi',
          'Umabe',
          '120',
          '6€'
        ],
        [
          'Zen Buddhismus',
          'Isso',
          '80',
          '8€'
        ]
      ]
    }
  },
  {
    name: 'Kunstfertige Tiere',
    from: {
      clues: [
        'Georgs Tier schlug ein Rad – oder besser: es sollte, denn tatsächlich bekam die Jury nur eine Seitwärtsrolle zu sehen, bei der das Tier so unglücklich fiel, dass jemand aus dem Publikum dem armen Tier aufhelfen musste. Die dafür verliehene Note fiel trotzdem überraschenderweise eine Notenstufe besser aus als die von Sabines Haustier.',
        'Das hüpfende – wahre Luftsprünge bekamen die Zuschauer nicht zu Gesicht – Kaninchen bekam nicht die Note 5, aber eine entweder um eine Notenstufe bessere oder schlechtere Bewertung als das Haustier, welches von Alina dressiert wurde – wenn man das Ganze euphemistisch als Dressur bezeichnen möchte',
        'Das Lamm bekommt eine um eine Notenstufe bessere oder schlechtere Note als Walters Tier. Das lag aber eher am lautstarken Mähen als am Kunststück',
        'Für das Salto gab es die Note 5. Die Juroren waren gnädig – vielleicht lag es an der unauffällig verteilten “Spende” von 20 € vor dem Wettkampf. Ein Salto hätten die Zuschauer jedenfalls nur gesehen, wenn sie selber eins gemacht hätten',
        'Der purzelnde Hamster bekam eine um eine Notenstufe schlechtere oder bessere Note als Theodors Rind, aber nicht die Note 4',
        'Alinas Tier, welches nicht gegen die Wand purzelte, wurde mit einer um eine Notenstufe besseren oder schlechteren Note bewertet als Andreas tierischer Athlet',
        'Die Gans bekam eine um zwei Notenstufen bessere oder schlechtere Note als Walters Zander, der anscheinend nicht sprechen wollte. Vielleicht sind wir aber auch zu kritisch und die aufsteigenden Luftblasen waren ein getarnter Kommunikationsversuch'
      ],
      solution: [
        [
          'Alina',
          'Lamm',
          'Salto',
          '5'
        ],
        [
          'Andreas',
          'Kaninchen',
          'Hüpfen',
          '4'
        ],
        [
          'Georg',
          'Gans',
          'Rad',
          '4'
        ],
        [
          'Sabine',
          'Hamster',
          'Purzeln',
          '5'
        ],
        [
          'Theodor',
          'Rind',
          'Einbeinig',
          '6'
        ],
        [
          'Walter',
          'Zander',
          'Sprechen',
          '6'
        ]
      ]
    },
    to: {
      clues: [
        'Georgs Tier schlug ein Rad – oder besser: es sollte, denn tatsächlich bekam die Jury nur eine Seitwärtsrolle zu sehen, bei der das Tier so unglücklich fiel, dass jemand aus dem Publikum dem armen Tier aufhelfen musste. Die dafür verliehene Note fiel trotzdem überraschenderweise eine Notenstufe besser aus als die von Sabines Haustier.',
        'Das hüpfende – wahre Luftsprünge bekamen die Zuschauer nicht zu Gesicht – Kaninchen bekam nicht die Note 5, aber eine entweder um eine Notenstufe bessere oder schlechtere Bewertung als das Haustier, welches von Alina dressiert wurde – wenn man das Ganze euphemistisch als Dressur bezeichnen möchte',
        'Das Lamm bekommt eine um eine Notenstufe bessere oder schlechtere Note als Walters Tier. Das lag aber eher am lautstarken Mähen als am Kunststück',
        'Für das Salto gab es die Note 5. Die Juroren waren gnädig – vielleicht lag es an der unauffällig verteilten “Spende” von 20 € vor dem Wettkampf. Ein Salto hätten die Zuschauer jedenfalls nur gesehen, wenn sie selber eins gemacht hätten',
        'Der purzelnde Hamster bekam eine um eine Notenstufe schlechtere oder bessere Note als Theodors Rind, aber nicht die Note 4',
        'Alinas Tier, welches nicht gegen die Wand purzelte, wurde mit einer um eine Notenstufe besseren oder schlechteren Note bewertet als Andreas tierischer Athlet',
        'Die Gans bekam eine um zwei Notenstufen bessere oder schlechtere Note als Walters Zander, der anscheinend nicht sprechen wollte. Vielleicht sind wir aber auch zu kritisch und die aufsteigenden Luftblasen waren ein getarnter Kommunikationsversuch',
        'Andreas bekam eine bessere Note als Theodor.'
      ],
      solution: [
        [
          'Alina',
          'Lamm',
          'Salto',
          '5'
        ],
        [
          'Andreas',
          'Kaninchen',
          'Hüpfen',
          '4'
        ],
        [
          'Georg',
          'Gans',
          'Rad',
          '4'
        ],
        [
          'Sabine',
          'Hamster',
          'Purzeln',
          '5'
        ],
        [
          'Theodor',
          'Rind',
          'Einbeinig',
          '6'
        ],
        [
          'Walter',
          'Zander',
          'Sprechen',
          '6'
        ]
      ]
    }
  },
  {
    name: 'Werdende Köche',
    from: {
      clues: [
        'Die Note des Lehrlinges, der sich an eunem Schokoladenparfait versuchte, ist vom Zahlenwert doppelt so groß, wie die des Talentes, der mit einer Zitronentarte überzeugen wollte.',
        'Herr Tres Note unterschied sich um 1 von der Note, die Frau Rat für ihr Gericht erhielt, deren Note wiederum um 1 schlechter war als die des Lehrlings, der sich an einem Karamelleis versucht.',
        'Die Note für den Apfel-Zimtstrudel ist ungerade und zwei Noten schlechter oder besser als die des Note für das Soufflé, welches eine Note schlechter abschnitt als das Parfait.',
        'Die Crêpes waren eine Note schlechter als das Gericht von Frau Sun, deren Gericht sich um zwei Notenstufen von Herrn Leks Werk unterschied.',
        'Herr Hof erhielt nicht die Note 4.',
        'Bei der Lösungseingabe sollen Akzente, sowie das Zirkumflex (^) weggelassen werden!'
      ],
      solution: [
        [
          'Hof',
          'Crêpes',
          '6'
        ],
        [
          'Lek',
          'Apfelstrudel',
          '3'
        ],
        [
          'Mal',
          'Schokoladenparfait',
          '4'
        ],
        [
          'Rat',
          'Zitronentarte',
          '2'
        ],
        [
          'Mal',
          'Soufflé',
          '5'
        ],
        [
          'Rat',
          'Karamelleis',
          '1'
        ]
      ]
    },
    to: {
      clues: [
        'Die Note des Lehrlinges, der sich an einem Schokoladenparfait versuchte, ist vom Zahlenwert doppelt so groß, wie die des Talentes, der mit einer Zitronentarte überzeugen wollte.',
        'Herr Tres Note unterschied sich um 1 von der Note, die Frau Rat für ihr Gericht erhielt, deren Note wiederum um 1 schlechter war als die des Lehrlings, der sich an einem Karamelleis versucht.',
        'Die Note für den Apfelstrudel ist ungerade und zwei Noten schlechter oder besser als die Note für das Soufflé, welches eine Note schlechter abschnitt als das Parfait.',
        'Die Crêpes waren eine Note schlechter als das Gericht von Frau Sun, deren Gericht sich um zwei Notenstufen von Herrn Leks Werk unterschied.',
        'Herr Hof erhielt nicht die Note 4.'
      ],
      solution: [
        [
          'Hof',
          'Crêpes',
          '6'
        ],
        [
          'Lek',
          'Apfelstrudel',
          '3'
        ],
        [
          'Mal',
          'Schokoladenparfait',
          '4'
        ],
        [
          'Rat',
          'Zitronentarte',
          '2'
        ],
        [
          'Sun',
          'Soufflé',
          '5'
        ],
        [
          'Tre',
          'Karamelleis',
          '1'
        ]
      ]
    }
  }
]

function parse (data) {
  return typeof data === 'string' ? JSON.parse(data) : data
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/**
 * The data with `fix` applied (or undone with `reverse`), or null if the
 * puzzle does not have the expected old clues and solution.
 */
function applyFix (fix, data, { reverse = false } = {}) {
  const [from, to] = reverse ? [fix.to, fix.from] : [fix.from, fix.to]
  if (!data || !same(data.clues, from.clues) || !same(data.solution, from.solution)) return null
  const { rules, ...rest } = data
  return {
    ...rest,
    attributes: reverse ? rest.attributes.map(({ ordered, ...attribute }) => attribute) : rest.attributes,
    clues: to.clues,
    solution: to.solution
  }
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
    let changed = applyFix(fix, parse(row.data), { reverse: direction === 'down' })
    if (!changed) continue
    if (direction === 'up') changed = (await withRules(row.name, changed)) || changed
    updates.push([row.id, changed])
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

  async up (qi) {
    await run(qi, 'up')
  },

  async down (qi) {
    await run(qi, 'down')
  }
}

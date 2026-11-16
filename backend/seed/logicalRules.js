// Formal rules for the seed Logikrätsel (see shared/puzzles/logicalSolver.js
// for what each rule means). This file is the readable source; `formalize`
// turns an entry into what is stored in a puzzle's data: `rules` with
// { attr, value } references, `ordered` on the compared categories and, for a
// category with an order of its own ('list'), its values in that order.
//
// Values are written as their text. If the same text is a value of several
// categories, write 'Category:Value'. `X` stands for "some person" inside
// exists(...). Each puzzle lists its clues in order: an array of rules, or
// gap('why') when the clue cannot be expressed yet (its rules are left out,
// so the puzzle is not checked for uniqueness), conflict('why', ...rules)
// when the clue contradicts the stored solution (the rules say what the clue
// says, but are not stored until the puzzle is fixed), or note() for a clue
// that only sets the scene.
//
// Used by the seed (seed/index.js), migration 20261116-01 and the tests.

const X = { var: 'X' };

const same = (a, b) => ({ type: 'same', a, b });
const not = (a, b) => ({ type: 'notSame', a, b });
const either = (a, b, c) => ({ type: 'eitherOr', a, b, c });
const before = (a, b, by) => ({ type: 'before', a, b, by });
const after = (a, b, by) => ({ type: 'after', a, b, by });
const dBefore = (a, b, by) => ({ type: 'directlyBefore', a, b, by });
const dAfter = (a, b, by) => ({ type: 'directlyAfter', a, b, by });
const nextTo = (a, b, by) => ({ type: 'nextTo', a, b, by });
const diff = (a, b, by, offset) => ({ type: 'differsBy', a, b, by, offset });
const absDiff = (a, b, by, offset) => ({ type: 'differsBy', a, b, by, offset, abs: true });
const times = (a, b, by, factor) => ({ type: 'times', a, b, by, factor });
const sum = (a, b, c, by) => ({ type: 'sum', a, b, c, by });
const any = (...rules) => ({ type: 'anyOf', rules });
const all = (...rules) => ({ type: 'allOf', rules });
const exists = (...rules) => ({ type: 'exists', var: 'X', rules });
const isNot = rule => ({ type: 'not', rules: [rule] });
const note = () => [{ type: 'note' }];
const gap = reason => ({ gap: reason });
const conflict = (reason, ...rules) => ({ conflict: reason, rules });
// a belongs to one of the values / to none of them.
const oneOf = (a, values) => any(...values.map(v => same(a, v)));
const noneOf = (a, values) => values.map(v => not(a, v));
// a and b take one of the listed value pairs.
const pairs = (a, b, list) => any(...list.map(([x, y]) => all(same(a, x), same(b, y))));
// a's and b's values of category `cat` (different entities) compare as
// `holds(key(a's value), key(b's value))`; key is world knowledge such as the
// length of a name. Expanded to the pairs that fit.
const compare = (a, b, cat, key, holds) => ({ type: '$compare', a, b, cat, key, holds });

const len = s => s.trim().length;

/* eslint-disable quote-props */
const FORMALIZATIONS = {
  'Asiatische Lektüre': {
    ordered: { Seiten: 'numeric', Kosten: 'numeric' },
    clues: [
      [diff('Zen Buddhismus', 'Qi', 'Kosten', 2), absDiff('Zen Buddhismus', 'Nguyen', 'Seiten', 5), not('Nguyen', 'Qi')],
      [same('Takeda', '5€'), diff('Takeda', 'Suzuki', 'Seiten', 5)],
      [diff('Asiens Seen', '120', 'Kosten', -1)],
      [diff('Isso', 'Thai Food', 'Seiten', -5), diff('Isso', 'Umabe', 'Kosten', 2)],
      [after('Thai Food', 'Asiens Inseln', 'Kosten'), same('Asiens Inseln', '100')]
    ]
  },

  'Aufgeregte Studenten': {
    ordered: { Punkte: 'numeric', Reihenfolge: 'numeric' },
    clues: [
      [oneOf('Svenja', ['Bauer', 'Bücher']), oneOf('Martin', ['Bauer', 'Bücher']),
        before('Svenja', '6.', 'Reihenfolge'), diff('Svenja', 'Vanessa', 'Punkte', 25), same('Vanessa', 'Karo'),
        diff('Vanessa', 'Tobias', 'Reihenfolge', 4), not('Vanessa', '10')],
      [oneOf('Tobias', ['Marinet', 'Menja', 'Müller']), oneOf('Samuel', ['Marinet', 'Menja', 'Müller']),
        oneOf('Ralf', ['Marinet', 'Menja', 'Müller']), sum('Samuel', 'Tobias', 'Ralf', 'Punkte'),
        exists(not(X, 'Achmet'), times('Tobias', X, 'Punkte', 0.5))],
      [diff('Marie', 'Plam', 'Reihenfolge', 1), diff('Marie', 'Vani', 'Reihenfolge', -1), after('Marie', 'Nina', 'Punkte')],
      [diff('Bücher', 'Björn', 'Punkte', 5), diff('Bücher', 'Müller', 'Punkte', -15)],
      [diff('Martin', 'Achmet', 'Punkte', -10), not('Martin', '10'),
        // Achmet's place is a multiple of Nina's.
        compare('Achmet', 'Nina', 'Reihenfolge', v => parseInt(v, 10), (a, b) => a % b === 0)],
      [oneOf('Holmet', ['8.', '9.']), same('45', '4.')],
      [exists(diff('Marinet', X, 'Reihenfolge', 2), diff(X, 'Trakon', 'Punkte', -40))]
    ]
  },

  'Baum des Jahres': {
    ordered: { 'Höhe': 'numeric', Jahreszeit: 'list' },
    clues: [
      [diff('Buche', 'Birke', 'Höhe', 6), same('Birke', 'Sommer')],
      [after('Linde', 'Fenn', 'Jahreszeit')],
      [diff('Herbst', 'Fenn', 'Höhe', 6), after('Fenn', 'Marn', 'Höhe')],
      [not('Arndt', 'Winter')],
      conflict('The stored Ahorn (34 m) is exactly 6 m smaller than the Birke of Marn (40 m).',
        same('Witzek', 'Ahorn'), not('Ahorn', '52'), isNot(diff('Ahorn', 'Marn', 'Höhe', -6)))
    ]
  },

  'Dekadenz': {
    ordered: { Automobile: 'numeric', Hubschrauber: 'numeric', Yachten: 'numeric' },
    clues: [
      [diff('Hansi', 'Magda', 'Automobile', 4)],
      [times('Armin', 'Hansi', 'Hubschrauber', 2)],
      [times('Erna', 'Armin', 'Yachten', 2)],
      [absDiff('Yachten:2', 'Yachten:3', 'Hubschrauber', 2), oneOf('Yachten:3', ['Hubschrauber:1', 'Hubschrauber:3'])],
      [diff('Erna', 'Hansi', 'Hubschrauber', 1)],
      [diff('Hubschrauber:3', 'Hubschrauber:2', 'Automobile', 8)]
    ]
  },

  'Erfreuliche Pilzsuche': {
    ordered: { Alter: 'numeric', Pilze: 'numeric' },
    clues: [
      [diff('Isabell', 'Maler', 'Alter', -4)],
      [diff('Bern', 'Daniel', 'Pilze', 2), diff('Daniel', '42', 'Pilze', 2)],
      [not('Marie', '38')],
      conflict('Stored: Marlen (Isabell) is 38, Leander 34, so Marlen is 4 years older.',
        diff('Marlen', 'Leander', 'Alter', -4)),
      [not('10', '34')],
      [diff('Leander', 'Ulbricht', 'Pilze', 2)]
    ]
  },

  'Gegen das Englische': {
    ordered: { Alter: 'numeric' },
    clues: [
      [not('Kunigunde', 'von Besoin'), diff('Kunigunde', 'von Kreuzberg', 'Alter', 2), diff('von Kreuzberg', 'Astrid', 'Alter', 2)],
      [diff('von Adem', 'von Amhof', 'Alter', 4)],
      [not('Ingrid', '68')],
      [exists(diff('Genophepha', X, 'Alter', 2), not(X, 'von Amhof'), absDiff(X, 'von Kreuzberg', 'Alter', 2))]
    ]
  },

  'Hund aufs Herz': {
    ordered: { Platz: 'numeric', Alter: 'numeric' },
    clues: [
      [same('Pfote', 'Platz:1'), after('Sheltie', 'Pfote', 'Alter'), not('Sheltie', 'Auftritt'), not('Sheltie', 'Bellen')],
      [oneOf('Platz:4', ['Yorkshire Terrier', 'Dalmatiner', 'Sheltie'])],
      [same('Yorkie', 'Yorkshire Terrier'), diff('Yorkie', 'Auftritt', 'Alter', 2), not('Yorkie', 'Platz:2')],
      [oneOf('Sherry', ['Platz:3', 'Platz:4']), same('Sherry', 'Augen'), not('Sherry', 'Chihuahua')],
      [same('Platz:5', 'Alter:2'), not('Platz:5', 'Dalmatiner')],
      [diff('Wuff', 'Streuner', 'Alter', 2), not('Streuner', 'Chihuahua'),
        exists(diff('Streuner', X, 'Alter', -1), diff(X, 'Golden Retriever', 'Platz', 1))]
    ]
  },

  'Kaninchenzucht': {
    ordered: { Alter: 'numeric', Kaninchen: 'numeric' },
    clues: [
      conflict('Stored: Gertje is 65, Antje 80.',
        diff('Gertje', 'Antje', 'Alter', 5),
        // A digit of Gertje's age is a digit of Roman's.
        compare('Gertje', 'Roman', 'Alter', v => v, (a, b) => [...a].some(d => b.includes(d)))),
      [before('Fridolin', 'Hanna', 'Alter'),
        // Hanna's age is not divisible by Fridolin's number of rabbits.
        any(...['55', '60', '65', '70', '80'].flatMap(age => ['1', '2', '3', '4', '5']
          .filter(k => Number(age) % Number(k) !== 0)
          .map(k => all(same('Hanna', age), same('Fridolin', 'Kaninchen:' + k)))))],
      [diff('Roman', 'Hanna', 'Kaninchen', -2)],
      [times('Fridolin', 'Antje', 'Kaninchen', 2)],
      [not('Gertje', 'Kaninchen:1')]
    ]
  },

  'Kongress der Wissenschaft': {
    ordered: { Dauer: 'numeric' },
    clues: [
      [diff('Franziska', 'Biologie', 'Dauer', 15), diff('Biologie', 'Joachim', 'Dauer', 15)],
      [diff('Geologie', 'Angela', 'Dauer', 30)],
      [absDiff('Bertram', 'Geographie', 'Dauer', 45)]
    ]
  },

  'Kunst der Architektur': {
    clues: [
      // No two entries of a row start with the same letter.
      [not('Abraham', 'Abalain'), not('Sandra', 'Spielplatz'), not('Selina', 'Spielplatz'), not('Emil', 'Etasis'),
        not('Sandra', 'Soof IV'), not('Selina', 'Soof IV'), not('Hooven', 'Hochhaus'), not('Merryman', 'Museum'),
        not('Mulligan', 'Museum'), not('Spielplatz', 'Soof IV')],
      [oneOf('Emil', ['Merryman', 'Mulligan']), oneOf('Selina', ['Merryman', 'Mulligan'])],
      [not('Abraham', 'Spielplatz'), not('Spielplatz', 'Goethe')],
      [same('Etasis', 'Hochhaus')],
      [same('Merryman', 'Wanda I')],
      [not('Luxusvilla', 'Mulligan')],
      [not('Hooven', 'Museum')]
    ]
  },

  'Kunstfertige Tiere': {
    // With clue 8 (Andreas better than Theodor) the clues have exactly one
    // solution (checked by brute force over the repeated grades).
    dataError: 'The grades repeat (4, 4, 5, 5, 6, 6); the solver needs distinct values in a category.'
  },

  'Kuriose Spezialitäten': {
    ordered: { Preis: 'numeric' },
    clues: [
      [diff('Apfel', 'Tomate', 'Preis', -1)],
      [not('blau', '1€')],
      [diff('schwarz', 'Karotte', 'Preis', 1)],
      [diff('Gurke', 'rosa', 'Preis', -0.5)]
    ]
  },

  'Mit dem Fahrrad durch England': {
    ordered: { Alter: 'numeric', Ankunft: 'numeric' },
    clues: [
      [diff('Claudia', '34', 'Ankunft', -2)],
      [diff('Susanne', '9:00', 'Alter', -2)],
      [diff('9:00', 'Matthias', 'Alter', -2)],
      [exists(absDiff('Hans', X, 'Ankunft', 1), diff(X, '28', 'Ankunft', -2))]
    ]
  },

  'Mit dem Fahrrad durch England - Teil 2': {
    ordered: { Seit: 'numeric', Platzierung: 'numeric' },
    clues: [
      [diff('Seit:4', 'Hans', 'Platzierung', -1)],
      [not('Susanne', 'Seit:3'), diff('Susanne', 'Seit:1', 'Platzierung', 1)],
      [diff('Hans', 'Matthias', 'Seit', 1)],
      [diff('Claudia', '3.', 'Seit', 1)]
    ]
  },

  'Späte musikalische Ambitionen': {
    ordered: { Alter: 'numeric' },
    clues: [
      [diff('Bose', 'Christian', 'Alter', 2)],
      [not('Gesang', 'Alfons'), diff('Gesang', 'Wasserzieher', 'Alter', -2), not('Wasserzieher', 'Schlagzeug')],
      [diff('Detlef', 'Proteus', 'Alter', 2)],
      [absDiff('Lindhberg', 'Detlef', 'Alter', 1)],
      [diff('Schlagzeug', 'Klavier', 'Alter', 1)]
    ]
  },

  'Urlaubsgeschichten': {
    ordered: { Vorname: 'alpha', Wochen: 'numeric' },
    clues: [
      [same('Frankreich', 'wunderschön'), diff('Frankreich', 'Deutschland', 'Wochen', -1), diff('Frankreich', 'Elaine', 'Wochen', 2)],
      [diff('Belgien', 'erholsam', 'Wochen', 3)],
      [after('Italien', 'facettenreich', 'Vorname')],
      [absDiff('Sybille', 'Liese', 'Wochen', 1), diff('Liese', 'Holland', 'Wochen', 1)],
      [diff('Theodor', 'kulturell', 'Wochen', 1)]
    ]
  },

  'Werdende Köche': {
    // Grades: 1 is the best, so "worse" means a larger number.
    ordered: { Note: 'numeric' },
    clues: [
      [times('Schokoladenparfait', 'Zitronentarte', 'Note', 2)],
      [absDiff('Tre', 'Rat', 'Note', 1), diff('Rat', 'Karamelleis', 'Note', 1)],
      [oneOf('Apfelstrudel', ['1', '3', '5']), absDiff('Apfelstrudel', 'Soufflé', 'Note', 2),
        diff('Soufflé', 'Schokoladenparfait', 'Note', 1)],
      [diff('Crêpes', 'Sun', 'Note', 1), absDiff('Sun', 'Lek', 'Note', 2)],
      [not('Hof', '4')]
    ]
  },

  'Wohltätiges Schwimmen': {
    ordered: { Meterangaben: 'numeric', Spenden: 'numeric' },
    clues: [
      [absDiff('Katja', 'Heino', 'Spenden', 2), after('Heino', '400', 'Spenden')],
      [diff('10€', '5€', 'Meterangaben', 100)],
      [diff('Sarah', 'Ulf', 'Meterangaben', 100)],
      [exists(diff('Ulf', X, 'Spenden', 2), not(X, '100'))]
    ]
  },

  'Zoologische Tauschgeschäfte': {
    ordered: { Anzahl: 'numeric', Jahr: 'numeric' },
    clues: [
      [diff('Giraffen', 'Nürnberg', 'Anzahl', 2)],
      [diff('2011', 'Elefanten', 'Anzahl', 2)],
      [diff('5', '3', 'Jahr', 1), diff('3', 'Nilpferde', 'Jahr', 1)],
      [not('Hannover', '2010')],
      [diff('Nashörner', 'Berlin', 'Anzahl', -1), diff('Berlin', 'Nürnberg', 'Jahr', -1)]
    ]
  },

  'Blumenzucht': {
    ordered: { Platzierung: 'numeric', Alter: 'numeric' },
    clues: [
      [diff('Anne', 'Rose', 'Alter', 8), absDiff('Anne', 'Gänseblümchen', 'Alter', 4)],
      [diff('Tim', 'Holger', 'Platzierung', 1), diff('Holger', 'Gänseblümchen', 'Platzierung', 1)],
      [diff('Beate', '36', 'Platzierung', 1)],
      [diff('Rose', 'Tulpe', 'Platzierung', 1), not('Tulpe', '40')]
    ]
  },

  'Autoren stellen sich vor': {
    ordered: { Alter: 'numeric', Buchanzahl: 'numeric' },
    clues: [
      [diff('Gertrud', 'Biographie', 'Alter', 5), diff('Gertrud', 'Krimi', 'Alter', -5), diff('Krimi', 'Lieselotte', 'Buchanzahl', -3)],
      [same('35', '8')],
      [oneOf('Fantasy', ['30', '40'])],
      [not('Franziska', 'Biographie'), diff('Franziska', 'Oskar', 'Buchanzahl', 2), absDiff('Franziska', 'Romanze', 'Alter', 15)],
      [diff('Olaf', 'Sci-Fi', 'Buchanzahl', -3)],
      [absDiff('Krimi', 'Oskar', 'Alter', 10)],
      [not('Lieselotte', 'Romanze'), not('Lieselotte', 'Biographie')]
    ]
  },

  'Kugeltrikolore': {
    ordered: { Rot: 'numeric', 'Weiß': 'numeric', Schwarz: 'numeric' },
    clues: [
      gap('Totals over several categories (red + white + black per person).'),
      [diff('Santander', 'Muriel', 'Schwarz', 1)],
      [diff('Wegener', 'Martha', 'Rot', -1)],
      gap('Totals over several categories (red + white + black per person).')
    ]
  },

  'Fleischhasser unter sich': {
    ordered: { Seit: 'numeric' },
    clues: [
      [diff('Till', 'Hitz', 'Seit', -5), diff('Hitz', 'Pescetarier', 'Seit', -5)],
      conflict('Stored: Marvin is the one with 20 years.', not('Marvin', '20'), not('Wotzek', '5')),
      [absDiff('Frederike', 'Vegetarier', 'Seit', 5), not('Frederike', 'Hitz'), absDiff('Frederike', 'Mall', 'Seit', 5), not('Mall', '20')],
      [diff('Fructarier', 'Vegan', 'Seit', 10), oneOf('Fructarier', ['Amalie', 'Marvin'])]
    ]
  },

  'Stricken auf Zeit': {
    ordered: { Alter: 'numeric', Titel: 'numeric' },
    clues: [
      [diff('Bertha', 'Severin', 'Alter', -10), diff('Severin', 'Ivonne', 'Alter', -10)],
      [diff('Marix', 'Steif', 'Titel', -2)],
      [diff('Bertha', '30', 'Titel', -2)],
      conflict('Stored: Uta is Steif herself.', diff('Uta', 'Steif', 'Alter', -20)),
      conflict('Stored: Ivonne has 4 titles, Peter 5.', diff('Ivonne', 'Peter', 'Titel', -2)),
      [not('50', 'Titel:5')]
    ]
  },

  'Marmeladenfreunde': {
    ordered: { Portionen: 'numeric' },
    clues: [
      [diff('Markus', 'Kirsche', 'Portionen', -20)],
      [not('Himbeere', 'Alaine'), diff('Himbeere', 'Ingwer', 'Portionen', 20)],
      [diff('Koriander', 'Tom', 'Portionen', 20)],
      [diff('Kümmel', 'Pflaume', 'Portionen', 10)],
      [diff('Zimt', 'Erdbeere', 'Portionen', 20)]
    ]
  },

  'Tanzabend': {
    ordered: { Seit: 'numeric' },
    clues: [
      [not('Mark', 'Anna')],
      [diff('Ivonne', 'Sven', 'Seit', -5)],
      [diff('Svenja', 'Tango', 'Seit', -5), diff('Tango', 'Flamenco', 'Seit', -5)],
      [diff('Michael', 'Timo', 'Seit', 10)],
      [absDiff('Eva', 'Anna', 'Seit', 10), absDiff('Eva', 'Rumba', 'Seit', 5)]
    ]
  },

  'Italienische Genüsse': {
    // Clue 2 says "Enrico"; the only name it can mean is Enno.
    ordered: { 'Eröffnung': 'numeric' },
    clues: [
      [not('Angelo', 'Margherita')],
      [same('Enno', 'Funghi'), diff('Enno', 'Rom', 'Eröffnung', -2)],
      [diff('Vier-Käse', 'Florenz', 'Eröffnung', -4)],
      [diff('Neapel', 'Tagliatelle', 'Eröffnung', 2), diff('Neapel', 'Spaghetti', 'Eröffnung', -2), not('Spaghetti', 'Rom')],
      [absDiff('Fusilli', 'Marcella', 'Eröffnung', 4)]
    ]
  },

  'KatzenträuMe': {
    ordered: { Alter: 'numeric' },
    clues: [
      [not('Wurst', 'Mi'), diff('Wurst', 'Hamburger', 'Alter', 3)],
      [diff('Britisch-Kurzhaar', 'Sahne', 'Alter', 1)],
      [not('Murmel', 'Torte'), diff('Murmel', 'Mona', 'Alter', -1), not('Mona', 'Sphynx')],
      [diff('Mau', 'Europäisch-Kurzhaar', 'Alter', 1)],
      [absDiff('Mi', 'Muffin', 'Alter', 4)],
      [diff('Europäisch-Langhaar', 'Britisch-Langhaar', 'Alter', 1), diff('Europäisch-Langhaar', 'Sphynx', 'Alter', -1)]
    ]
  },

  'Zaubererwettstreit': {
    ordered: { Alter: 'numeric' },
    clues: [
      // Mr. X is a man: Adrian or Hugo.
      [oneOf('Mr. X', ['Adrian', 'Hugo'])],
      [absDiff('Zersägen', 'Anja', 'Alter', 5), absDiff('Zersägen', 'Marija', 'Alter', 5)],
      [after('Magnus', 'Wasserkessel', 'Alter'), not('Magnus', 'Anja'), not('Wasserkessel', 'Anja')],
      [before('Dr. Mircale', 'Mr. X', 'Alter')],
      [after('Karten', 'Fantasto', 'Alter'), not('Fantasto', 'Hugo'), before('Karten', 'Verschwinden', 'Alter'), not('Verschwinden', 'Hugo')]
    ]
  },

  'Weltenbummler': {
    ordered: { Alter: 'numeric', 'Anzahl Länder': 'numeric' },
    clues: [
      [diff('China', 'Lola', 'Anzahl Länder', -10)],
      [diff('Peru', 'Franziska', 'Anzahl Länder', -5), diff('Peru', 'Alter:35', 'Anzahl Länder', 5)],
      // "more than one country per year over five years": more than 5.
      [absDiff('Kathrin', 'Neuseeland', 'Anzahl Länder', 5), not('Neuseeland', 'Anzahl Länder:5')],
      [diff('Alter:50', 'Grönland', 'Anzahl Länder', -10)],
      [diff('Beate', 'Monika', 'Anzahl Länder', 5)],
      [diff('Kathrin', 'Peru', 'Alter', -5)]
    ]
  },

  'Klassikliebhaber': {
    ordered: { Alter: 'numeric' },
    clues: [
      [diff('Mozart', 'Valentin', 'Alter', 5), diff('Mozart', 'Klarinette', 'Alter', -5)],
      [not('Beethoven', 'Sandra'), diff('Beethoven', 'Schubert', 'Alter', -5)],
      [diff('Klavier', 'Violine', 'Alter', -5)],
      [diff('Oboe', 'Ursula', 'Alter', -5)]
    ]
  },

  'Lieblingsdichter': {
    ordered: { Alter: 'numeric', 'Anzahl Gedichte': 'numeric' },
    clues: [
      [not('Ilse', 'Göthe'), diff('Ilse', 'Eichendorff', 'Anzahl Gedichte', -2), not('Eichendorff', 'Martin')],
      [not('Martin', '50')],
      conflict('Stored: Anger (Steve) reads 5 poems, Beate 1.', diff('Anger', 'Beate', 'Anzahl Gedichte', 1)),
      [diff('Schiller', 'Dichter:Brecht', 'Anzahl Gedichte', -1), same('Dichter:Brecht', 'Nachname:Brecht')],
      conflict('Stored: Beate is 30, Steve 60.', diff('Beate', 'Steve', 'Alter', -20)),
      [diff('Imminger', '40', 'Anzahl Gedichte', -1)]
    ]
  },

  'Lieferantenchaos': {
    ordered: { Tag: 'list', Waggons: 'numeric' },
    clues: [
      [diff('Stahl', 'Ziegel', 'Waggons', -40), not('Stahl', 'Dienstag')],
      [diff('Alan', 'Schotter', 'Tag', -2), diff('Alan', 'Lucy', 'Waggons', -20)],
      [times('Mizuki', 'Holz', 'Waggons', 2), diff('Mizuki', 'Bobby', 'Tag', 1), diff('Mizuki', 'Glas', 'Tag', -1)],
      [diff('Sam', 'Glas', 'Waggons', -60), not('Sam', 'Freitag'), not('Sam', 'Schotter')]
    ]
  },

  'Wagner Opern': {
    ordered: { Alter: 'numeric' },
    clues: [
      // "Frau Vonn": a woman (Genophepha, Renate, Uta).
      [not('Ring der Nibelungen', 'Santos'), diff('Ring der Nibelungen', 'Genophepha', 'Alter', -10), diff('Genophepha', 'Vonn', 'Alter', -5),
        oneOf('Vonn', ['Genophepha', 'Renate', 'Uta'])],
      [diff('Parsifal', 'Oster', 'Alter', -5)],
      [not('Renate', 'Wann')],
      [absDiff('Werner', 'Peter', 'Alter', 5), not('Peter', 'Mauser')],
      [diff('Meistersinger von Nürnberg', 'Der fliegende Holländer', 'Alter', 5), diff('Meistersinger von Nürnberg', 'Wann', 'Alter', -5)]
    ]
  },

  'Müslierfinder': {
    ordered: { 'Anzahl Zutaten': 'numeric' },
    clues: [
      [diff('Rebecca', 'Samuel', 'Anzahl Zutaten', -4)],
      [not('Reis', 'Fruchtig'), diff('Reis', 'Kürbis', 'Anzahl Zutaten', -4)],
      [absDiff('Mango', 'Asien', 'Anzahl Zutaten', 4)],
      [not('Tobias', 'Fruchtig')],
      [not('Anja', '12')],
      [diff('Spezial', 'Goldstaub', 'Anzahl Zutaten', -8), not('Goldstaub', 'Anja')]
    ]
  },

  'Harry Potter': {
    // The clues describe the wizards; the rules say whom they mean.
    clues: [
      [same('Gilderoy Lockhart', 'Grüner Zaubertrank')],
      [same('Gilderoy Lockhart', 'Schiebt Vorhänge zur Seite')],
      [not('Pomona Sprout', 'Öffnet die Truhe')],
      [same('Bringt Objekte zum schweben', 'Violetter Zaubertrank')],
      [same('Horace Slughorn', 'Roter Zaubertrank')]
    ]
  },

  'Wichtel-Rätsel': {
    clues: [
      [same('Mami', 'Hund')],
      [same('Weihnachtsmann', 'Katze')],
      [same('Frau Holle', 'Tierhaarallergie')],
      [same('Mami', 'keine Kinder')],
      [same('Weihnachtsmann', 'ein Kind')],
      [same('Christkind', 'Kaninchen')],
      [same('Christkind', 'drei Kinder')],
      [same('Frau Holle', 'vier Kinder')],
      [same('Weihnachtsmann', 'Gans')],
      [same('Mami', 'Würstchen')],
      [same('Christkind', 'Raclette')],
      [same('Frau Holle', 'Fisch')]
    ]
  },

  'Jonglieren geht über Probieren': {
    ordered: { Anzahl: 'numeric' },
    clues: [
      [diff('Albrich', 'Bernd', 'Anzahl', 2), absDiff('Albrich', 'Stifte', 'Anzahl', 1)],
      [diff('Severin', 'Frederik', 'Anzahl', -2)],
      [not('Kettensägen', 'Bös'), diff('Kettensägen', 'Bälle', 'Anzahl', 1)],
      [exists(diff('Katja', X, 'Anzahl', -1), absDiff(X, 'Keulen', 'Anzahl', 1))]
    ]
  },

  'Wettessweltmeister': {
    ordered: { 'Anzahl Hot Dogs': 'numeric' },
    clues: [
      [diff('Barik', 'Jumbo', 'Anzahl Hot Dogs', 1), not('Jumbo', 'Hot Dog'), diff('Barik', 'Sens', 'Anzahl Hot Dogs', -1)],
      [diff('Schweinebraten', 'Manso', 'Anzahl Hot Dogs', -1)],
      [absDiff('Pizza', 'Hot Bob', 'Anzahl Hot Dogs', 2)],
      [not('Wall', 'Pizza'), absDiff('Wall', 'Fat Marco', 'Anzahl Hot Dogs', 1)]
    ]
  },

  'Gewichtestemmer': {
    ordered: { Gewicht: 'numeric', Alter: 'numeric' },
    clues: [
      [diff('Frank', 'Schmitt', 'Gewicht', -200)],
      [diff('Mark', '300', 'Alter', 10), diff('Mark', 'Storch', 'Alter', -10)],
      [isNot(diff('Wals', 'Storch', 'Gewicht', -100))],
      [not('Frank', '60')],
      [diff('Titus', 'Andres', 'Alter', 10), diff('Andres', 'Storch', 'Gewicht', -200)]
    ]
  },

  'Ergotherapeutin': {
    // Geography: Kiel is furthest north; the longest trip to each meeting
    // city is from Kiel, except to Kiel itself (from München).
    clues: [
      [same('Klose', 'Kiel'), oneOf('Klose', ['Ingenieurin', 'Stuntfrau'])],
      [same('Stuntfrau', 'Martens')],
      [not('Anna', 'Mannheim')],
      [same('Anna', 'Erzieherin'), not('Anna', 'Wöhrle')],
      [same('Ergotherapeutin', 'Wöhrle')],
      [not('Regina', 'Wöhrle'), pairs('Wöhrle', 'Regina',
        [['Erfurt', 'Kiel'], ['Kiel', 'München'], ['Mannheim', 'Kiel'], ['München', 'Kiel']])],
      // She travels, so the meeting is not at her place.
      [same('Birgitta', 'München'), not('Birgitta', 'Wöhrle')]
    ]
  },

  'Geocacher': {
    ordered: { 'Fund nach Publish': 'numeric' },
    clues: [
      [same('Golwischer', '48 Minuten')],
      [same('Blauer Mondschein', '30 Minuten'), not('Blauer Mondschein', 'Wherigo')],
      [not('Einhard', 'Multi')],
      [same('Mainfuchs', 'Mystery'), same('Rote Badehose', 'Tradi'), diff('Mystery', 'Rote Badehose', 'Fund nach Publish', 6)],
      [same('Letterbox', '54 Minuten')],
      [same('Luy83', 'Grüner Baum'), isNot(diff('Grüner Baum', 'Braune Erde', 'Fund nach Publish', 6))]
    ]
  },

  'Wahrsagerinnen': {
    ordered: { Alter: 'numeric' },
    clues: [
      [diff('Glaskugel', 'Löwe', 'Alter', -10)],
      [diff('Marie', 'Suzan', 'Alter', 5), diff('Marie', 'Schütze', 'Alter', -5)],
      [diff('Margaret', 'Tarot', 'Alter', 10)],
      [not('Kaffeesatz', 'Margaret'), diff('Kaffeesatz', 'Stier', 'Alter', 10)],
      [not('Joli', 'Stier'), absDiff('Joli', 'Hand', 'Alter', 5)]
    ]
  },

  'Konservendosen': {
    ordered: { Position: 'numeric' },
    clues: [
      [diff('Lila', 'Grün', 'Position', -2)],
      [diff('Gelb', 'Rosa', 'Position', -2), dBefore('Rosa', 'Rot', 'Position')],
      [not('Blau', '1')]
    ]
  },

  'YouTube-Sternchen': {
    ordered: { Alter: 'numeric', Abonnenten: 'numeric' },
    clues: [
      // Women: Amy, Anke, Sultana; men: Mark, Sam.
      [oneOf('Makeup', ['Amy', 'Anke', 'Sultana'])],
      [oneOf('Gaming', ['Mark', 'Sam'])],
      [times('Sam', 'Anke', 'Abonnenten', 2)],
      [times('Gesang', 'Comedy', 'Abonnenten', 2), diff('Gesang', 'Gaming', 'Abonnenten', -500000)],
      [diff('Sultana', 'Gesang', 'Alter', 2), diff('Sultana', 'Gaming', 'Alter', -2)],
      [diff('Amy', 'Makeup', 'Alter', 2)],
      [diff('Comedy', 'Anke', 'Alter', -2)]
    ]
  },

  'Maja': {
    ordered: { Dauer: 'numeric' },
    clues: [
      [not('Lampions', 'Sa')],
      [same('Willi', 'Tische'), same('Willi', 'Mi'), not('Willi', '600')],
      [same('Alexander', '500'), same('Alexander', 'Ablenken')],
      [same('Thekla', 'Do'), same('Thekla', '200')],
      [not('Kurt', 'Mo')],
      [after('Pavillon', 'Spiele', 'Dauer'), diff('Pavillon', 'Fr', 'Dauer', -200)],
      [same('Puck', '300')],
      [same('Flip', 'Di')],
      [same('Musik', '400')]
    ]
  },

  'Kinorätsel': {
    // Row 10 is at the bottom, right in front of the screen; row 1 at the top.
    ordered: { Reihe: 'numeric' },
    clues: [
      [not('Rolf', 'Apfelschorle'), same('Rolf', '10')],
      [same('Hannah', 'Schokolade'), after('Hannah', 'Stefanie', 'Reihe')],
      [same('Wilhelm', 'Dirty Dancing')],
      [same('Stefanie', 'Orangensaft'), not('Stefanie', '1')],
      [same('4', 'Nachos')],
      [same('Eiskonfekt', 'Blues Brothers')],
      [after('Wilhelm', 'Peter', 'Reihe'), not('Wilhelm', 'Nachos')],
      [not('8', 'Sprudelwasser'), same('8', 'Casablanca')],
      [same('Cola', 'Gummibärchen')],
      [same('Vom Winde verweht', 'Apfelschorle')]
    ]
  },

  'Strohsterne': {
    clues: [
      [same('Anja', '4')],
      gap('Seats at the table are not a category of the puzzle.'),
      [same('Sabine', 'Nachbarin')],
      [same('Sophie', 'blau')],
      gap('Seats at the table are not a category of the puzzle.'),
      [same('12', 'weiß')],
      [same('Hafer', 'Mama')],
      gap('Seats at the table are not a category of the puzzle.'),
      [same('5', 'Roggen')],
      gap('Seats at the table are not a category of the puzzle.'),
      [same('Roggen', 'Oma')],
      gap('Seats at the table are not a category of the puzzle.'),
      [same('Dinkel', 'gold')],
      gap('Seats at the table are not a category of the puzzle.'),
      [same('Caro', 'Gerste')],
      gap('Seats at the table are not a category of the puzzle.')
    ]
  },

  'Der Stasi-Spitzel': {
    clues: [
      // Five letters: Pawel or Peter.
      [oneOf('NATTER', ['Pawel', 'Peter'])],
      [same('Peter', 'EULE')],
      [same('EULE', 'graue Haare')],
      [not('Paul', 'dicker Bauch'), not('Paul', 'Plattfüße')],
      [not('Pawel', 'dicker Bauch')],
      [same('Patrick', 'Familie')],
      [same('Plattfüße', 'Sportverein')],
      [same('LUCHS', 'Arbeit')]
    ]
  },

  'Skilager': {
    order: { Sitzplatz: ['links', 'halblinks', 'Mitte', 'halbrechts', 'rechts'] },
    clues: [
      [same('Dani', 'orange')],
      [same('Mitte', 'Handschuh')],
      [any(all(before('gelb', 'orange', 'Sitzplatz'), before('orange', 'grün', 'Sitzplatz')),
        all(before('grün', 'orange', 'Sitzplatz'), before('orange', 'gelb', 'Sitzplatz'))),
      not('Frau Zulian', 'grün')],
      [same('Anna', 'Frau Beutler'), not('Anna', 'Mitte'), same('Anna', 'Schlitten')],
      [before('Cony', 'orange', 'Sitzplatz')],
      [same('Emma', 'Schal'), same('Emma', 'rechts')],
      [before('Frau Achermann', 'Handschuh', 'Sitzplatz')],
      [not('Dani', 'Handschuh'), not('Dani', 'Schal')],
      [same('Beni', 'blau'), same('Beni', 'Snowboard')],
      [not('Frau Zulian', 'Dani'), not('Frau Zulian', 'Cony'), not('Schneeschuhe', 'Handschuh'),
        not('Schneeschuhe', 'Skistock'), not('Schneeschuhe', 'Frau Wiltz')],
      [any(all(dBefore('Helm', 'Frau Achermann', 'Sitzplatz'), dBefore('Frau Achermann', 'Snowblades', 'Sitzplatz')),
        all(dBefore('Snowblades', 'Frau Achermann', 'Sitzplatz'), dBefore('Frau Achermann', 'Helm', 'Sitzplatz')))],
      [after('blau', 'rot', 'Sitzplatz')],
      [before('Skibrille', 'Mitte', 'Sitzplatz')],
      [any(all(before('Schal', 'orange', 'Sitzplatz'), before('orange', 'Handschuh', 'Sitzplatz')),
        all(before('Handschuh', 'orange', 'Sitzplatz'), before('orange', 'Schal', 'Sitzplatz')))],
      [not('Frau Maurer', 'Beni'), not('Frau Maurer', 'Dani')]
    ]
  },

  'Haustiere': {
    ordered: { 'Alter vom Haustier': 'numeric' },
    clues: [
      [same('Mimi', '13')],
      [times('Bob', 'Sabine', 'Alter vom Haustier', 2)],
      [same('Goldfisch', 'Flocken')],
      [same('Mohrrüben', 'Stefan')],
      [same('Sabine', '1')],
      [same('Schwarz', 'Hund'), not('Hund', 'Sabine')],
      [same('Karl', 'Weiß')],
      [same('Grau', 'Feuchtfutter'), same('Hase', 'Mohrrüben')],
      [same('Martin', 'Trockenfutter')],
      [not('Tobi', 'Katze'), not('Tobi', 'Flocken')],
      [same('Stefan', '2')]
    ]
  },

  'Logik des Thing': {
    // Animals: Schimmel (horse), Ochsenkarren (oxen). Vegetarian: Smørrebrød.
    // Water: Einbaum, Hansekogge, Langschiff. Islands: Grönland, Island.
    clues: [
      [not('Runer Jonsson', 'Schimmel'), not('Runer Jonsson', 'Ochsenkarren'), same('Runer Jonsson', 'Smørrebrød')],
      [same('Ragnarr Loðbrók', 'Rabe'), same('Ragnarr Loðbrók', 'Schimmel')],
      [same('Erik der Rote', 'Grönland'), same('Erik der Rote', 'Langschiff'), same('Erik der Rote', 'Hörnerhelm')],
      [same('Thor Heyerdahl', 'Sustrømming'), same('Thor Heyerdahl', 'Schweden')],
      [same('Harald Blåtand', 'singendes Schwert'), same('Harald Blåtand', 'Elsdyr')],
      [not('Schweden', 'nur ein Auge')],
      [same('Norwegen', 'Einbaum')],
      [oneOf('Røde Pølser', ['Ragnarr Loðbrók', 'Runer Jonsson'])],
      [oneOf('Krone', ['Ochsenkarren', 'Schimmel'])],
      [oneOf('Smørrebrød', ['Grönland', 'Island'])]
    ]
  },

  'Hüttenbesuch': {
    // Meat: Schnitzel, Wurstsalat. Alcohol: Helles, Weißbier (both beer).
    ordered: { Zimmer: 'numeric' },
    clues: [
      [oneOf('Ines', ['Schnitzel', 'Wurstsalat'])],
      [noneOf('Volz', ['Schnitzel', 'Wurstsalat', 'Helles', 'Weißbier'])].flat(),
      [oneOf('Edmund', ['Bad-Kissinger-Hütte', 'Kemptener-Hütte', 'Stuttgarter-Hütte'])],
      [before('Erwin', 'Volz', 'Zimmer'), after('Erwin', 'Papert', 'Zimmer'), oneOf('Andrea', ['Helles', 'Weißbier'])],
      [compare('Reinhold', 'Ines', 'Nachname', len, (a, b) => a < b), compare('Reinhold', 'Edmund', 'Nachname', len, (a, b) => a < b)],
      conflict('Stored: room 10 drinks Ski-Wasser, Ingwerlimonade is room 8.', same('10', 'Ingwerlimonade')),
      [compare('Papert', 'Ehses', 'Vorname', len, (a, b) => a > b), compare('Papert', 'Hillary', 'Vorname', len, (a, b) => a > b)],
      [not('Stuttgarter-Hütte', '5'), oneOf('Willers-Alpe', ['8', '10']), oneOf('Bad-Kissinger-Hütte', ['5', '10'])],
      [...noneOf('Bad-Kissinger-Hütte', ['Schnitzel', 'Wurstsalat']), ...noneOf('Karwendelhaus', ['Schnitzel', 'Wurstsalat']),
        oneOf('Willers-Alpe', ['Schnitzel', 'Wurstsalat']), ...noneOf('Willers-Alpe', ['Helles', 'Weißbier']),
        oneOf('Penne Arrabiata', ['Helles', 'Weißbier']), oneOf('Wurstsalat', ['Helles', 'Weißbier'])],
      [not('Papert', '10')],
      [oneOf('Ehses', ['4', '6'])],
      [same('Messner', 'Stuttgarter-Hütte')],
      conflict('Stored: Andrea has 4, and the only 8 is Ines, who has the Schnitzel.',
        exists(times('Andrea', X, 'Zimmer', 0.5), not(X, 'Schnitzel'))),
      [not('Kemptener-Hütte', 'Wurstsalat'), not('Kemptener-Hütte', 'Erwin'), same('Erwin', 'Johannisbeerschorle')],
      [before('Helles', 'Weißbier', 'Zimmer')],
      [before('Gemüse-Curry', 'Tofu-Würstchen', 'Zimmer')]
    ]
  },

  'Masternix': {
    // Steindrog = Steinkrug, Tontopf = Tonschüssel.
    clues: [
      [same('Knorrfix', 'Kupferkessel'), not('Knorrfix', 'Wasser')],
      [not('Rührfix', 'Tonschüssel')],
      [not('Trinkfix', 'Wein'), same('Trinkfix', 'Nelke')],
      [not('Glühfix', 'Kardamon'), not('Glühfix', 'Zimt')],
      [not('Knorrfix', 'Wein')],
      [same('Rührfix', 'Rum')],
      [not('Wasser', 'Tonschüssel')],
      [same('Eisentopf', 'Zimt')]
    ]
  }
};
/* eslint-enable quote-props */

// ---------------------------------------------------------------------------
// Resolving an entry against a puzzle's data
// ---------------------------------------------------------------------------

const trim = s => String(s).trim();

function categoryIndex (attributes, name) {
  const i = attributes.findIndex(a => trim(a.name) === trim(name));
  if (i < 0) throw new Error(`no category "${name}"`);
  return i;
}

function resolveRef (attributes, text) {
  if (text && typeof text === 'object') return text; // { var }
  const colon = text.indexOf(':');
  if (colon > 0) {
    const cat = attributes.findIndex(a => trim(a.name) === trim(text.slice(0, colon)));
    if (cat >= 0) {
      const value = attributes[cat].values.find(v => trim(v) === trim(text.slice(colon + 1)));
      if (value === undefined) throw new Error(`no value "${text}"`);
      return { attr: cat, value };
    }
  }
  const found = [];
  attributes.forEach((a, attr) => a.values.forEach(value => { if (trim(value) === trim(text)) found.push({ attr, value }); }));
  if (found.length !== 1) throw new Error(`${found.length ? 'ambiguous' : 'no'} value "${text}"`);
  return found[0];
}

function resolveRule (attributes, rule) {
  if (rule.type === '$compare') {
    const cat = categoryIndex(attributes, rule.cat);
    const values = attributes[cat].values;
    const fits = [];
    for (const x of values) {
      for (const y of values) {
        if (x !== y && rule.holds(rule.key(trim(x)), rule.key(trim(y)))) fits.push([x, y]);
      }
    }
    const a = resolveRef(attributes, rule.a);
    const b = resolveRef(attributes, rule.b);
    const ref = value => ({ attr: cat, value });
    return {
      type: 'anyOf',
      rules: fits.map(([x, y]) => ({ type: 'allOf', rules: [{ type: 'same', a, b: ref(x) }, { type: 'same', a: b, b: ref(y) }] }))
    };
  }
  const out = { ...rule };
  if (rule.rules) out.rules = rule.rules.map(sub => resolveRule(attributes, sub));
  for (const key of ['a', 'b', 'c']) if (rule[key] !== undefined) out[key] = resolveRef(attributes, rule[key]);
  if (rule.by !== undefined) out.by = categoryIndex(attributes, rule.by);
  return out;
}

/**
 * The entry for a puzzle applied to its data: { data, gaps } with `data` the
 * puzzle data with `ordered`, value orders and `rules` set (rules of gap
 * and conflict clues left out), `gaps` the clue indices that could not be
 * formalised, `conflicts` those that contradict the stored solution.
 * Null when there is no entry or it is marked as a data error.
 */
function formalize (name, data) {
  const entry = FORMALIZATIONS[name];
  if (!entry || entry.dataError) return null;
  const attributes = data.attributes.map(a => ({ ...a, values: [...a.values] }));
  let solution = data.solution.map(row => [...row]);
  for (const [cat, mode] of Object.entries(entry.ordered || {})) {
    attributes[categoryIndex(attributes, cat)].ordered = mode;
  }
  for (const [cat, order] of Object.entries(entry.order || {})) {
    const c = categoryIndex(attributes, cat);
    const values = order.map(text => attributes[c].values.find(v => trim(v) === trim(text)));
    if (values.some(v => v === undefined) || values.length !== attributes[c].values.length) {
      throw new Error(`order of "${cat}" does not list its values`);
    }
    attributes[c].values = values;
    attributes[c].ordered = 'list';
    if (c === 0) solution = values.map(v => solution.find(row => row[0] === v));
  }
  if (entry.clues.length !== data.clues.length) {
    throw new Error(`${name}: ${entry.clues.length} clue entries for ${data.clues.length} clues`);
  }
  const rules = [];
  const gaps = [];
  const conflicts = [];
  entry.clues.forEach((clue, i) => {
    if (clue.conflict) {
      conflicts.push(i);
      clue.rules.forEach(rule => resolveRule(attributes, rule)); // still has to resolve
      return;
    }
    if (!Array.isArray(clue)) { gaps.push(i); return; }
    for (const rule of clue) rules.push({ clue: i, ...resolveRule(attributes, rule) });
  });
  return { data: { ...data, attributes, solution, rules }, gaps, conflicts };
}

module.exports = { FORMALIZATIONS, formalize };

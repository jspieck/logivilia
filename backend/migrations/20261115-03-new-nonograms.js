// Adds the 60 nonograms of November 2026 (30 in colour, 30 black and white;
// all in seed/nonograms.json) to an existing database. See
// addSeedNonograms.js for the rules (fresh databases are skipped, existing
// names are kept, owner = first Admin).

const { addSeedNonograms, removeSeedNonograms } = require('./addSeedNonograms');

const COLOUR = [
  'Herzklopfen', 'Häuschen', 'Fliegenpilz', 'Kirschen', 'Achtelnoten', 'Anker',
  'Regenschirm', 'Goldstern', 'Würfelglück', 'Krone', 'Tannenbaum', 'Leuchtturm',
  'Ab ins All', 'Segeltörn', 'Stachelfreund', 'Erdbeere', 'Blauwal', 'Gute Nacht',
  'Panzerträger', 'Nachteule', 'Ananas', 'Achtarmig', 'Schlaufuchs', 'Teestunde',
  'Lagerfeuer-Gitarre', 'Falter', 'Ritterburg', 'Volldampf', 'Stachelkugel', 'Halloween'
];

const BLACK_AND_WHITE = [
  'Wegweiser', 'Donnerkeil', 'Prost', 'Schachturm', 'Kerzenschein', 'Samtpfote',
  'Pik', 'Sonnenschein', 'Post für dich', 'Wieso?', 'Abflug', 'Lupe',
  'Schnappschuss', 'Wecker', 'Besuch von oben', 'Blechkamerad', 'Buuh!', 'Achtbeiner',
  'Wollknäuel', 'Langhals', 'Seepferdchen', 'Scherenhand', 'Campingplatz', 'Oldtimer',
  'Zahnrad', 'Durchblick', 'Eiskristall', 'Springer', 'Tukan', 'Daumen hoch'
];

const NAMES = [...COLOUR, ...BLACK_AND_WHITE];

module.exports = {
  NAMES,

  async up (qi) {
    await addSeedNonograms(qi, NAMES);
  },

  async down (qi) {
    await removeSeedNonograms(qi, NAMES);
  }
};

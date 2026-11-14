const {Nonogram} = require('../models');
const createPuzzleController = require('./puzzleController');
const { publicNonogram } = require('../utils/puzzleView');
const { verifyNonogram } = require('../utils/verifySolution');

module.exports = createPuzzleController({
  model: Nonogram,
  idParam: 'nonogramId',
  label: 'Nonogram',
  view: publicNonogram,
  verify: verifyNonogram,
  bodyField: 'grid',
  editableFields: ['name', 'difficulty', 'width', 'height', 'numColor',
    'colors', 'solution', 'date', 'author']
});

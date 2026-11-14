const {Linelog} = require('../models');
const createPuzzleController = require('./puzzleController');
const { publicLinelog } = require('../utils/puzzleView');
const { verifyLinelog } = require('../utils/verifySolution');

module.exports = createPuzzleController({
  model: Linelog,
  idParam: 'linelogId',
  label: 'Linelog',
  view: publicLinelog,
  verify: verifyLinelog,
  bodyField: 'grid',
  editableFields: ['name', 'difficulty', 'width', 'height', 'numColor',
    'colors', 'information', 'solution', 'date']
});

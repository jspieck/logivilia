const {Logical} = require('../models');
const createPuzzleController = require('./puzzleController');
const { publicLogical } = require('../utils/puzzleView');
const { verifyLogical } = require('../utils/verifySolution');

module.exports = createPuzzleController({
  model: Logical,
  idParam: 'logicalId',
  label: 'Logical',
  view: publicLogical,
  verify: verifyLogical,
  bodyField: 'solution',
  editableFields: ['name', 'difficulty', 'description', 'question', 'clues',
    'attributes', 'solution', 'image', 'date', 'author']
});

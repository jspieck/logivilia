const {Linelog} = require('../models');
const createPuzzleController = require('./puzzleController');

module.exports = createPuzzleController({
  model: Linelog,
  idParam: 'linelogId',
  label: 'Linelog',
  editableFields: ['name', 'difficulty', 'width', 'height', 'numColor',
    'colors', 'information', 'solution', 'date']
});

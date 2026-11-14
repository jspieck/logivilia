const {Nonogram} = require('../models');
const createPuzzleController = require('./puzzleController');

module.exports = createPuzzleController({
  model: Nonogram,
  idParam: 'nonogramId',
  label: 'Nonogram',
  editableFields: ['name', 'difficulty', 'width', 'height', 'numColor',
    'colors', 'solution', 'date', 'author']
});

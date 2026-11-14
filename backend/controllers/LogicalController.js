const {Logical} = require('../models');
const createPuzzleController = require('./puzzleController');

module.exports = createPuzzleController({
  model: Logical,
  idParam: 'logicalId',
  label: 'Logical',
  editableFields: ['name', 'difficulty', 'description', 'question', 'clues',
    'attributes', 'solution', 'image', 'date', 'author']
});

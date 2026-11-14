// Logical (logic grid / zebra puzzle).
// data: { description, question, clues, attributes, solution, image }
// solution: one row per value of the first attribute (that value in column 0),
// then the matching value of every other attribute.

/** @type {import('../index').PuzzleTypePlugin<'logical'>} */
const logical = {
  type: 'logical',
  dataFields: ['description', 'question', 'clues', 'attributes', 'solution', 'image'],

  checkData (data) {
    const { attributes, solution, clues } = data;
    if (!Array.isArray(attributes) || attributes.length < 2) {
      return 'attributes must list at least two categories';
    }
    const valueCount = Array.isArray(attributes[0]?.values) ? attributes[0].values.length : 0;
    if (valueCount < 2 || !attributes.every(a =>
      a && typeof a.name === 'string' && Array.isArray(a.values) && a.values.length === valueCount)) {
      return 'every attribute needs a name and the same number of values';
    }
    if (!Array.isArray(clues) || !clues.every(c => typeof c === 'string')) {
      return 'clues must be a list of strings';
    }
    if (!Array.isArray(solution) || solution.length !== valueCount ||
        !solution.every(row => Array.isArray(row) && row.length === attributes.length)) {
      return 'solution must have one row per value and one column per attribute';
    }
    return null;
  },

  computeClues (data) {
    const { solution, ...rest } = data;
    return rest;
  },

  // Rows in the same order, values compared as strings. Column 0 is the fixed
  // row label, not player input, so it is not compared.
  validate (data, answer) {
    const solution = data.solution;
    if (!Array.isArray(solution) || !Array.isArray(answer) || answer.length !== solution.length) {
      return false;
    }
    return solution.every((row, i) =>
      Array.isArray(answer[i]) &&
      answer[i].length === row.length &&
      row.every((cell, j) => j === 0 || String(cell) === String(answer[i][j]))
    );
  }
};

export default logical;

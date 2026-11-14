// What the API sends to players for each puzzle type. The stored solution
// never leaves the server: players get only what they need to solve the
// puzzle, and the server checks finished grids (see verifySolution.js).

const { nonogramClues, linelogInformationColors } = require('./verifySolution');

function withoutSolution (puzzle) {
  const data = typeof puzzle.toJSON === 'function' ? puzzle.toJSON() : { ...puzzle };
  delete data.solution;
  return data;
}

/** @returns {import('@logivilia/shared').PublicNonogram} */
function publicNonogram (nonogram) {
  return { ...withoutSolution(nonogram), ...nonogramClues(nonogram) };
}

/** @returns {import('@logivilia/shared').PublicLinelog} */
function publicLinelog (linelog) {
  return {
    ...withoutSolution(linelog),
    informationColors: linelogInformationColors(linelog)
  };
}

/** @returns {import('@logivilia/shared').PublicLogical} */
function publicLogical (logical) {
  return withoutSolution(logical);
}

module.exports = {
  publicNonogram,
  publicLinelog,
  publicLogical
};

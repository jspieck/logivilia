const {User, Logical, Nonogram, Linelog} = require('../models');
const { publicUser } = require('../utils/userView');
const { verifyNonogram, verifyLinelog, verifyLogical } = require('../utils/verifySolution');
const { sendError } = require('../utils/apiError');

// Builds a handler that marks a puzzle as solved for the logged-in user,
// after checking the submitted state on the server.
function solvedHandler ({ model, idParam, listField, verify, bodyField }) {
  return async function (req, res) {
    try {
      // Users can only record solves for themselves.
      if (String(req.params.userId) !== String(req.user.id)) {
        return sendError(res, 403, 'FORBIDDEN');
      }
      const puzzleId = parseInt(req.params[idParam], 10);
      const puzzle = await model.findByPk(puzzleId);
      if (!puzzle) {
        return sendError(res, 404, 'PUZZLE_NOT_FOUND');
      }
      if (!verify(puzzle, req.body && req.body[bodyField])) {
        return sendError(res, 400, 'SOLUTION_INCORRECT');
      }
      const user = req.user;
      const solvedList = Array.isArray(user[listField]) ? user[listField] : [];
      if (!solvedList.includes(puzzleId)) {
        user[listField] = [...solvedList, puzzleId];
        await user.save();
      }
      res.send({ success: true });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'SOLUTION_SAVE_FAILED');
    }
  };
}

module.exports = {
  async show (req, res) {
    try {
      const user = await User.findByPk(req.params.userId);
      if (!user) {
        return sendError(res, 404, 'USER_NOT_FOUND');
      }
      res.send(publicUser(user));
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'USER_NOT_FOUND');
    }
  },
  async update (req, res) {
    try {
      const user = req.user;
      user.gender = req.body.gender;
      user.city = req.body.city;
      user.birthyear = req.body.birthyear;
      user.bio = req.body.bio;
      await user.save();
      res.send({ success: true });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'USER_NOT_FOUND');
    }
  },
  linelogSolved: solvedHandler({
    model: Linelog,
    idParam: 'linelogId',
    listField: 'solvedLinelogs',
    verify: verifyLinelog,
    bodyField: 'grid'
  }),
  nonogramSolved: solvedHandler({
    model: Nonogram,
    idParam: 'nonogramId',
    listField: 'solvedNonograms',
    verify: verifyNonogram,
    bodyField: 'grid'
  }),
  logicalSolved: solvedHandler({
    model: Logical,
    idParam: 'logicalId',
    listField: 'solvedLogicals',
    verify: verifyLogical,
    bodyField: 'solution'
  })
};

// Shared CRUD handlers for the puzzle types (Logical, Nonogram, Linelog).
// `editableFields` is the whitelist of fields a client may set; everything
// else (id, UserId, timestamps) is controlled by the server.
// `view` turns a stored puzzle into what players get (no solution), and
// `verify` + `bodyField` check a submitted grid for `POST /<type>/:id/check`.

const { sendError } = require('../utils/apiError');

const ADMIN_ROLE = 'Admin';

function pickFields (body, fields) {
  const result = {};
  for (const field of fields) {
    if (body[field] !== undefined) {
      result[field] = body[field];
    }
  }
  return result;
}

module.exports = function createPuzzleController ({ model, idParam, editableFields, view, verify, bodyField }) {
  return {
    async index (req, res) {
      try {
        res.send((await model.findAll()).map(view));
      } catch (err) {
        console.error(err);
        sendError(res, 500, 'PUZZLE_LIST_FAILED');
      }
    },
    async show (req, res) {
      try {
        const puzzle = await model.findByPk(req.params[idParam]);
        if (!puzzle) {
          return sendError(res, 404, 'PUZZLE_NOT_FOUND');
        }
        res.send(view(puzzle));
      } catch (err) {
        console.error(err);
        sendError(res, 500, 'PUZZLE_FETCH_FAILED');
      }
    },
    async post (req, res) {
      try {
        const data = pickFields(req.body, editableFields);
        data.UserId = req.user.id;
        res.send(await model.create(data));
      } catch (err) {
        console.error(err);
        sendError(res, 500, 'PUZZLE_CREATE_FAILED');
      }
    },
    async put (req, res) {
      try {
        const puzzle = await model.findByPk(req.params[idParam]);
        if (!puzzle) {
          return sendError(res, 404, 'PUZZLE_NOT_FOUND');
        }
        const isOwner = puzzle.UserId != null && puzzle.UserId === req.user.id;
        const isAdmin = req.user.role === ADMIN_ROLE;
        if (!isOwner && !isAdmin) {
          return sendError(res, 403, 'FORBIDDEN');
        }
        await puzzle.update(pickFields(req.body, editableFields));
        res.send(puzzle);
      } catch (err) {
        console.error(err);
        sendError(res, 500, 'PUZZLE_UPDATE_FAILED');
      }
    },
    // Lets anyone (also guests) ask whether a finished grid is correct.
    // Logged-in players record a solve via PATCH /users/:id/<type>/:id,
    // which runs the same check.
    async check (req, res) {
      try {
        const puzzle = await model.findByPk(req.params[idParam]);
        if (!puzzle) {
          return sendError(res, 404, 'PUZZLE_NOT_FOUND');
        }
        res.send({ solved: verify(puzzle, req.body && req.body[bodyField]) });
      } catch (err) {
        console.error(err);
        sendError(res, 500, 'PUZZLE_FETCH_FAILED');
      }
    }
  };
};

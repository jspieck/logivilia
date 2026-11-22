// Server-side drafts of the puzzle editors, so unfinished work follows a
// logged-in creator to other devices ("Meine Rätsel"). The server stores the
// editor's snapshot (`state`) without reading it; the puzzle itself is only
// checked when it is published (POST /puzzles with { draftId }).

const { PuzzleDraft } = require('../models');
const { isPuzzleType } = require('../puzzles');
const { sendError } = require('../utils/apiError');

// A 100x100 nonogram snapshot is about 40 KB; logic puzzles are smaller.
const MAX_STATE_BYTES = 300 * 1024;
const MAX_DRAFTS_PER_USER = 50;
const MAX_NAME_LENGTH = 255;

function parseId (value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** { name, state } from the body, or null if it is not a usable draft. */
function draftInput (body) {
  const state = body && body.state;
  if (!state || typeof state !== 'object' || Array.isArray(state) ||
      JSON.stringify(state).length > MAX_STATE_BYTES) {
    return null;
  }
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, MAX_NAME_LENGTH) : '';
  return { name: name || null, state };
}

/** The draft as the list shows it (no state). */
const summary = draft => ({ id: draft.id, type: draft.type, name: draft.name, updatedAt: draft.updatedAt });

async function findOwnDraft (req, res) {
  const id = parseId(req.params.draftId);
  const draft = id && await PuzzleDraft.findOne({ where: { id, UserId: req.user.id } });
  if (!draft) {
    sendError(res, 404, 'DRAFT_NOT_FOUND');
    return null;
  }
  return draft;
}

module.exports = {
  // GET /drafts - the logged-in user's drafts, newest first, without state.
  async index (req, res) {
    try {
      const drafts = await PuzzleDraft.findAll({
        attributes: ['id', 'type', 'name', 'updatedAt'],
        where: { UserId: req.user.id },
        order: [['updatedAt', 'DESC'], ['id', 'DESC']]
      });
      res.send(drafts.map(summary));
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'DRAFT_LIST_FAILED');
    }
  },

  // GET /drafts/:draftId - one own draft with its state.
  async show (req, res) {
    try {
      const draft = await findOwnDraft(req, res);
      if (draft) {
        res.send({ ...summary(draft), state: draft.state });
      }
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'DRAFT_LIST_FAILED');
    }
  },

  // POST /drafts - { type, name?, state } -> the new draft's summary.
  async post (req, res) {
    try {
      const type = req.body && req.body.type;
      const input = draftInput(req.body);
      if (!isPuzzleType(type) || !input) {
        return sendError(res, 400, 'DRAFT_INVALID');
      }
      const count = await PuzzleDraft.count({ where: { UserId: req.user.id } });
      if (count >= MAX_DRAFTS_PER_USER) {
        return sendError(res, 400, 'DRAFT_LIMIT', { max: MAX_DRAFTS_PER_USER });
      }
      const draft = await PuzzleDraft.create({ ...input, type, UserId: req.user.id });
      res.send(summary(draft));
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'DRAFT_SAVE_FAILED');
    }
  },

  // PUT /drafts/:draftId - { name?, state } replaces the draft's content.
  async put (req, res) {
    try {
      const input = draftInput(req.body);
      if (!input) {
        return sendError(res, 400, 'DRAFT_INVALID');
      }
      const draft = await findOwnDraft(req, res);
      if (!draft) {
        return;
      }
      draft.set(input);
      // Sequelize does not notice a replaced JSON value on its own.
      draft.changed('state', true);
      await draft.save();
      res.send(summary(draft));
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'DRAFT_SAVE_FAILED');
    }
  },

  // DELETE /drafts/:draftId
  async delete (req, res) {
    try {
      const draft = await findOwnDraft(req, res);
      if (draft) {
        await draft.destroy();
        res.send({ deleted: true });
      }
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'DRAFT_SAVE_FAILED');
    }
  }
};

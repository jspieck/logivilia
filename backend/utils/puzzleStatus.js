// Review status of a puzzle (column Puzzles.status). New puzzles by creators
// wait for an Admin ('pending'); an Admin publishes or rejects them. Only
// published puzzles are public: lists, the start page, "next", rankings and
// comments ignore the others, and only the author and Admins can open them.

const ADMIN_ROLE = 'Admin';

const STATUS = Object.freeze({
  PUBLISHED: 'published',
  PENDING: 'pending',
  REJECTED: 'rejected'
});

const isAdmin = user => !!user && user.role === ADMIN_ROLE;

const isOwner = (puzzle, user) => !!user && puzzle.UserId != null && puzzle.UserId === user.id;

/** May `user` (or a guest, null) see `puzzle`? */
function canView (puzzle, user) {
  return puzzle.status === STATUS.PUBLISHED || isOwner(puzzle, user) || isAdmin(user);
}

/** May `user` see the solution of `puzzle` (and, unless locked, change it)? */
function canEdit (puzzle, user) {
  return isOwner(puzzle, user) || isAdmin(user);
}

/**
 * A published puzzle is locked for its author: changes would skip the
 * review, and players may have solved or started it. Only Admins edit it.
 */
function isLocked (puzzle, user) {
  return puzzle.status === STATUS.PUBLISHED && !isAdmin(user);
}

/** Status of a newly created puzzle: Admins publish directly. */
function initialStatus (user) {
  return isAdmin(user) ? STATUS.PUBLISHED : STATUS.PENDING;
}

/**
 * Status after `user` edited `puzzle`: a rejected puzzle edited by its
 * author goes back into the review queue; everything else keeps its status
 * (authors cannot edit published puzzles, see isLocked).
 */
function statusAfterEdit (puzzle, user) {
  return puzzle.status === STATUS.REJECTED && !isAdmin(user) ? STATUS.PENDING : puzzle.status;
}

module.exports = { STATUS, ADMIN_ROLE, isAdmin, isOwner, canView, canEdit, isLocked, initialStatus, statusAfterEdit };

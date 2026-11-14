// All API errors are sent as `{ code, params? }`. The frontend translates the
// code (see shared/errorCodes.json and frontend/src/i18n), so the backend
// carries no user-facing text.
const ErrorCodes = require('@logivilia/shared/errorCodes.json');

/**
 * @param {import('express').Response} res
 * @param {number} status HTTP status
 * @param {import('@logivilia/shared').ErrorCode} code
 * @param {Record<string, string | number>} [params]
 */
function sendError (res, status, code, params) {
  if (!Object.prototype.hasOwnProperty.call(ErrorCodes, code)) {
    console.error(`[apiError] unknown error code "${code}" - sending INTERNAL_ERROR`);
    code = ErrorCodes.INTERNAL_ERROR;
  }
  /** @type {import('@logivilia/shared').ApiError} */
  const body = params ? { code, params } : { code };
  return res.status(status).send(body);
}

module.exports = { sendError, ErrorCodes };

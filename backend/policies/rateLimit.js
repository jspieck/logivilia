const { sendError } = require('../utils/apiError');

// Minimal in-memory fixed-window rate limiter, keyed by client IP.
// Good enough for a single server process; use a shared store (e.g. Redis)
// if the backend ever runs on several instances.
module.exports = function rateLimit ({ windowMs, max }) {
  const hits = new Map();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) {
        hits.delete(key);
      }
    }
  }, windowMs);
  cleanup.unref();

  return function (req, res, next) {
    const key = req.ip;
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return sendError(res, 429, 'RATE_LIMITED');
    }
    next();
  };
};

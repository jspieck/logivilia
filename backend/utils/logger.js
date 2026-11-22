// File logging for hosts where the Node console is not visible (netcup
// Plesk shows only web-server logs). install() copies everything written via
// console.log/info/warn/error into LOG_FILE, with a timestamp, and records
// crashes (uncaught exceptions, unhandled promise rejections) before the
// process dies. Admins can read the tail via GET /api/admin/logs.
//
// LOG_FILE defaults to <repo>/logs/app.log (git-ignored, and outside the
// Plesk document root frontend/dist, so not reachable from the web). The file
// is rotated to app.log.1 once it passes LOG_MAX_BYTES (default 5 MB), so at
// most two files are kept.

const fs = require('fs');
const path = require('path');
const util = require('util');

const DEFAULT_FILE = path.join(__dirname, '..', '..', 'logs', 'app.log');
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

let logFile = null;
let maxBytes = DEFAULT_MAX_BYTES;
let installed = false;
let writing = false; // guards against recursion if a write itself logs

function rotateIfNeeded () {
  try {
    if (fs.statSync(logFile).size >= maxBytes) {
      fs.renameSync(logFile, `${logFile}.1`);
    }
  } catch (err) {
    // ENOENT: no file yet, nothing to rotate.
  }
}

function writeLine (level, args) {
  if (!logFile || writing) return;
  writing = true;
  try {
    const text = util.format(...args);
    rotateIfNeeded();
    fs.appendFileSync(logFile, `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} ${text}\n`);
  } catch (err) {
    // Logging must never take the app down; the console still has the line.
  } finally {
    writing = false;
  }
}

function install () {
  if (installed || process.env.NODE_ENV === 'test' || process.env.LOG_FILE === 'off') {
    return;
  }
  installed = true;
  logFile = path.resolve(process.env.LOG_FILE || DEFAULT_FILE);
  maxBytes = parseInt(process.env.LOG_MAX_BYTES || '', 10) || DEFAULT_MAX_BYTES;
  try {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
  } catch (err) {
    console.error(`[logger] cannot create log directory for ${logFile}:`, err.message);
    logFile = null;
    return;
  }

  for (const level of ['log', 'info', 'warn', 'error']) {
    const original = console[level].bind(console);
    console[level] = (...args) => {
      original(...args);
      writeLine(level === 'log' ? 'info' : level, args);
    };
  }

  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception (process exits):', err);
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled promise rejection:', reason);
  });
}

// A writable stream for morgan's access log lines (they end with "\n").
const accessStream = {
  write (line) {
    writeLine('http', [line.replace(/\n$/, '')]);
  }
};

// The last `lines` lines of the current log file ('' if there is none).
function tail (lines) {
  if (!logFile) return '';
  let text;
  try {
    // Read at most the last 1 MB; plenty for a few hundred lines.
    const { size } = fs.statSync(logFile);
    const start = Math.max(0, size - 1024 * 1024);
    const fd = fs.openSync(logFile, 'r');
    try {
      const buf = Buffer.alloc(size - start);
      fs.readSync(fd, buf, 0, buf.length, start);
      text = buf.toString('utf8');
    } finally {
      fs.closeSync(fd);
    }
  } catch (err) {
    return '';
  }
  return text.split('\n').filter(Boolean).slice(-lines).join('\n');
}

module.exports = { install, accessStream, tail, get file () { return logFile; } };

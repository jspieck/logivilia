// Dumps the MySQL database to backups/logivilia-<timestamp>.sql.gz with
// mysqldump and keeps the newest BACKUP_KEEP (default 14) dumps.
//   npm run backup              (from the repository root)
// Uses the same DB_* variables as the app. mysqldump must be on PATH (it is
// in the docker image: `docker compose exec db mysqldump ...` also works).
// On netcup Plesk, use the Backup-Manager instead (docs/OPERATIONS.md).

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BACKUP_DIR = path.resolve(process.env.BACKUP_DIR || path.join(__dirname, '..', '..', 'backups'));
const KEEP = parseInt(process.env.BACKUP_KEEP || '14', 10);

function timestamp () {
  return new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 13);
}

function prune () {
  const dumps = fs.readdirSync(BACKUP_DIR)
    .filter(f => /^logivilia-.*\.sql\.gz$/.test(f))
    .sort()
    .reverse();
  for (const old of dumps.slice(KEEP)) {
    fs.unlinkSync(path.join(BACKUP_DIR, old));
    console.log(`Removed old backup ${old}`);
  }
}

function main () {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const target = path.join(BACKUP_DIR, `logivilia-${timestamp()}.sql.gz`);
  const args = [
    '--single-transaction', '--routines', '--triggers', '--no-tablespaces',
    '-h', process.env.DB_HOST || 'localhost',
    '-P', process.env.DB_PORT || '3306',
    '-u', process.env.DB_USER,
    process.env.DB_NAME || 'logivilia'
  ];
  // Password via the environment, so it does not show up in the process list.
  const dump = spawn('mysqldump', args, {
    env: { ...process.env, MYSQL_PWD: process.env.DB_PASSWORD || '' },
    stdio: ['ignore', 'pipe', 'inherit']
  });
  const out = fs.createWriteStream(target);
  dump.stdout.pipe(zlib.createGzip()).pipe(out);

  dump.on('error', (err) => {
    console.error(`Cannot run mysqldump: ${err.message}`);
    fs.rmSync(target, { force: true });
    process.exit(1);
  });
  dump.on('close', (code) => {
    if (code !== 0) {
      console.error(`mysqldump exited with code ${code}; no backup written.`);
      fs.rmSync(target, { force: true });
      process.exit(1);
    }
    out.on('close', () => {
      console.log(`Backup written: ${target} (${fs.statSync(target).size} bytes)`);
      prune();
    });
  });
}

main();

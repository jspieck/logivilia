# Logivilia – Operations

How to see what the live server is doing and how to back up and restore the database. Hosting details (Plesk paths, deploy steps) are in [HANDOVER.md](HANDOVER.md).

## 1. Health check

`GET https://logivilia.de/api/health` is public and returns, for example:

```json
{ "status": "ok", "db": "ok", "puzzles": "ok", "uptime": 5321, "version": "1.0.0", "time": "2026-11-22T12:00:00.000Z" }
```

- **200** when the database answers within 3 seconds, **503** with `"db": "error"` otherwise.
- `puzzles: "loading"` only appears in the first moments after a restart.
- **After every deploy** open this URL once. If `uptime` is small, the restart really happened.
- **Uptime monitor (recommended, free):** add the URL as an HTTP(S) keyword monitor in UptimeRobot, Better Stack or similar, with keyword `"status":"ok"` and an interval of 5 minutes, alerting your e-mail address. You then hear about an outage before users do.

## 2. Server log

Plesk's "Protokolle" shows only the web server's access log, not Node's console. The app therefore writes its own log file (`backend/utils/logger.js`):

- **What goes in:** everything the server prints (`console.log/warn/error`), startup and migration messages, every e-mail result, every request that ended in a 5xx error, uncaught exceptions and unhandled promise rejections (with stack traces).
- **Where:** `logs/app.log` in the app root, on Plesk `/logivilia.de/httpdocs/logs/app.log`. It is outside the document root (`frontend/dist`), so it cannot be downloaded over the web, and it is git-ignored, so "Pull updates" leaves it alone. At 5 MB it is renamed to `app.log.1` (the older `app.log.1` is replaced), so it never takes more than about 10 MB.
- **Read it in the browser:** log in as Admin, then call `GET /api/admin/logs?lines=300` with your token, e.g. from the browser console on logivilia.de:

  ```js
  fetch('/api/admin/logs?lines=300', { headers: { Authorization: 'Bearer ' + JSON.parse(sessionStorage.getItem('logivilia-store')).token } }).then(r => r.text()).then(console.log)
  ```

  (or with curl and the token from the login response).
- **Read it in Plesk:** Dateien → `httpdocs/logs/app.log` → open or download.
- **Settings** (Plesk → Node.js → Umgebung, all optional): `LOG_FILE` (another path, or `off`), `LOG_MAX_BYTES`.

## 3. Database backups

### Routine (production, netcup Plesk)

1. **Automatic daily backup:** Plesk → Websites & Domains → **Backup-Manager** → **Einstellungen für geplante Backups**: activate, *täglich*, content *Websites/Datenbanken* (at least the database `logivilia`), keep **14** backups. If your plan allows it, add an external storage (FTP or cloud) under *Remote-Speicher* so the backups survive a hosting problem.
2. **Monthly off-site copy:** once a month, download the latest backup (Backup-Manager → backup → *Herunterladen*) or export the database (Datenbanken → logivilia → **Exportieren**, or phpMyAdmin → Exportieren → SQL) and keep it outside netcup.
3. **Before risky changes** (migrations that drop or rewrite data, `npm run drop:legacy`, bulk imports): make a manual backup in the Backup-Manager (*Sichern*) or a database export first.
4. **Twice a year: test a restore** (see below) into a local database. A backup that was never restored is a guess.

### Local / anywhere with mysqldump

```
npm run backup
```

writes `backups/logivilia-<date>-<time>.sql.gz` (git-ignored) using the `DB_*` variables and keeps the newest 14 (`BACKUP_KEEP`, `BACKUP_DIR` change this). It needs `mysqldump` on PATH.

### Restore

1. Stop the app (Plesk → Node.js → *Deaktivieren*), so nothing writes during the restore.
2. Restore either via Backup-Manager → backup → *Wiederherstellen* → only the database, or import the dump: Datenbanken → logivilia → **Importieren** (or phpMyAdmin → Importieren). Locally:

   ```
   gunzip -c backups/logivilia-<date>-<time>.sql.gz | mysql -h localhost -u logivilia -p logivilia
   ```

3. Start the app again. Pending migrations run on start (`DB_MIGRATE_ON_START`), so a restore of an older dump is brought up to the current schema.
4. Check `/api/health` and log in once.

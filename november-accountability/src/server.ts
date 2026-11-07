import { createApp } from './app.ts';
import { loadEnv } from './env.ts';
import { listen } from './node-http.ts';

loadEnv();

const port = Number(process.env.PORT ?? 8742);
const host = process.env.HOST ?? '127.0.0.1';
if (!Number.isFinite(port) || port <= 0) {
  console.error('PORT is not usable.');
  process.exit(1);
}

const desk = createApp({
  dbPath: process.env.DB_PATH ?? 'data/tracker.sqlite',
  adminToken: process.env.ADMIN_TOKEN?.trim() || null,
  siteAccessCode: process.env.SITE_ACCESS_CODE?.trim() || null,
  timezone: process.env.COMMUNITY_TIMEZONE ?? 'America/New_York',
  keysFile: process.env.KEYS_FILE ?? 'data/private/last-import-keys.json',
  cookieSecure: process.env.COOKIE_SECURE === '1',
});

const server = listen(desk, host, port);
server.on('listening', () => {
  console.log(`November desk local draft at http://${host}:${port}`);
  console.log('Not a live site. Opt-in data is not bundled in the public files.');
  if (!process.env.ADMIN_TOKEN?.trim()) console.log('ADMIN_TOKEN is not set. Keeper import is off.');
  if (!process.env.SITE_ACCESS_CODE?.trim()) console.log('SITE_ACCESS_CODE is not set. This host is not gated.');
});

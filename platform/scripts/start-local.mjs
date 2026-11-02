import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

// Production preview: stable hashed assets, no dev HMR chunk swaps.
const local = !process.env.DATABASE_URL;
const port = Number(process.env.LOCAL_DB_PORT || 55432);
const dir = resolve('.local/postgres');
const buildId = existsSync(resolve('.next/BUILD_ID')) ? readFileSync(resolve('.next/BUILD_ID'), 'utf8').trim() : process.env.BUILD_ID;
if (!buildId) throw new Error('Missing production build. Run npm run build first.');
const env = { ...process.env, BUILD_ID: buildId, DATABASE_URL: process.env.DATABASE_URL || `postgresql://postgres:postgres@127.0.0.1:${port}/elysium_sandbox`, NEXT_TELEMETRY_DISABLED: '1', COOKIE_SECURE: process.env.COOKIE_SECURE || 'false' };
let pg;
let child;
let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  child?.kill('SIGTERM');
  try { await pg?.stop(); } catch {}
  process.exit(code);
}
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
try {
  if (local) {
    mkdirSync(dir, { recursive: true });
    pg = new EmbeddedPostgres({ databaseDir: dir, user: 'postgres', password: 'postgres', port, persistent: true, autoRehydrateSymlinks: true, postgresFlags: ['-c', 'listen_addresses=127.0.0.1'], onLog: (m) => console.log(String(m)), onError: (message) => console.error(String(message)), initdbFlags: ['--locale=C', '--encoding=UTF8', '--lc-messages=C'] });
    if (!existsSync(resolve(dir, 'PG_VERSION'))) await pg.initialise({ initdbFlags: ['--locale=C', '--encoding=UTF8', '--lc-messages=C'] });
    await pg.start();
    const client = pg.getPgClient('postgres');
    await client.connect();
    const found = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', ['elysium_sandbox']);
    if (!found.rowCount) await client.query('CREATE DATABASE elysium_sandbox');
    await client.end();
  }
  const migrate = spawn(process.execPath, ['--import', 'tsx', '--conditions=react-server', 'scripts/migrate.ts'], { env, stdio: 'inherit' });
  const code = await new Promise((done) => migrate.on('exit', done));
  if (code !== 0) throw new Error('Database migration failed');
  child = spawn(process.execPath, [createRequire(import.meta.url).resolve('next/dist/bin/next'), 'start', '--hostname', '0.0.0.0', ...process.argv.slice(2)], { env, stdio: 'inherit' });
  child.on('exit', (code) => void stop(code ?? 0));
} catch (error) { console.error(error); await stop(1); }

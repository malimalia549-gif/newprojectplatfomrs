import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

// Next collects route configuration during compilation. This non-secret build-only
// URL is never embedded as a browser value or used by the production start script.
const env = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://build:build@127.0.0.1:5432/build_only',
  NEXT_TELEMETRY_DISABLED: '1',
  BUILD_ID: process.env.BUILD_ID || randomUUID(),
};
const result = spawnSync(process.execPath, [createRequire(import.meta.url).resolve('next/dist/bin/next'), 'build'], { stdio: 'inherit', env });
if (result.error) throw result.error;
process.exit(result.status ?? 1);

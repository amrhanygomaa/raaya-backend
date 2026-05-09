const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const seedFile = join(process.cwd(), 'migrations', 'seed_all.sql');
const result = spawnSync(
  'psql',
  [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-f', seedFile],
  { stdio: 'inherit' },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log('Database seed complete.');

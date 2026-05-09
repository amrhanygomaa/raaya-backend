const { spawnSync } = require('node:child_process');
const { readdirSync } = require('node:fs');
const { join } = require('node:path');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const migrationsDir = join(process.cwd(), 'migrations');
const files = readdirSync(migrationsDir)
  .filter((file) => /^0.*\.sql$/.test(file))
  .sort();

for (const file of files) {
  const filePath = join(migrationsDir, file);
  console.log(`Running ${file}...`);
  const result = spawnSync(
    'psql',
    [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-f', filePath],
    { stdio: 'inherit' },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('Database migrations complete.');

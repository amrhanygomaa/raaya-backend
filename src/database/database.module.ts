/**
 * Database module – provides a singleton pg Pool to the entire application.
 *
 * Reads DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD from env.
 * Exports the Pool instance via the token 'PG_POOL'.
 */

import { Module, Global, Logger } from '@nestjs/common';
import { Pool } from 'pg';

export const PG_POOL = 'PG_POOL';

const sslConfig = () => {
  const dbSsl = process.env.DB_SSL?.toLowerCase();
  if (dbSsl === 'true' || dbSsl === 'require') {
    return { rejectUnauthorized: false };
  }
  if (dbSsl === 'false' || dbSsl === 'disable') {
    return undefined;
  }
  return process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : undefined;
};

const poolFactory = {
  provide: PG_POOL,
  useFactory: (): Pool => {
    const logger = new Logger('DatabaseModule');

    const pool = new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: sslConfig(),
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    pool.on('error', (err) => {
      logger.error('Unexpected idle-client error', err.message);
    });

    logger.log(
      `Pool created → ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    );

    return pool;
  },
};

@Global()
@Module({
  providers: [poolFactory],
  exports: [PG_POOL],
})
export class DatabaseModule {}

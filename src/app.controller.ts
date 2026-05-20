import { Controller, Get, Inject, Optional } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Pool } from 'pg';
import { PG_POOL } from './database/database.module';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Optional() @Inject(PG_POOL) private readonly pool?: Pool,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Root greeting' })
  @ApiResponse({ status: 200, description: 'Hello message.' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({
    status: 200,
    description: 'Service health status.',
    schema: {
      type: 'object',
      properties: { status: { type: 'string', example: 'ok' } },
    },
  })
  getHealth(): object {
    return { status: 'ok' };
  }

  @Get('health/db')
  @ApiOperation({ summary: 'DB connectivity diagnostic (temporary)' })
  async getDbHealth(): Promise<Record<string, unknown>> {
    const env: Record<string, unknown> = {
      DB_HOST: process.env.DB_HOST,
      DB_NAME: process.env.DB_NAME,
      DB_USER: process.env.DB_USER,
      NODE_ENV: process.env.NODE_ENV,
    };
    if (!this.pool) {
      return { db: 'no pool injected', env };
    }
    try {
      const result = await this.pool.query<Record<string, unknown>>(
        'SELECT current_database() AS db, current_user AS usr, version() AS ver',
      );
      const row = result.rows[0] ?? {};
      return { status: 'ok', ...row, env };
    } catch (err: unknown) {
      return {
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
        env,
      };
    }
  }
}

/**
 * US-14-01 – ActivitiesService
 */

import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { PG_POOL } from '../database/database.module';
import { ActivitySession } from './activities.schema';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

function rowToActivity(row: Record<string, unknown>): ActivitySession {
  return {
    id: row.id as string,
    facilityId: row.facility_id as string,
    title: row.title as string,
    description: (row.description as string) ?? undefined,
    startTime:
      (row.start_time as Date)?.toISOString?.() ?? (row.start_time as string),
    location: (row.location as string) ?? undefined,
    participants: (row.participants as unknown[]) ?? [],
    createdBy: row.created_by as string,
    createdAt:
      (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
    updatedAt:
      (row.updated_at as Date)?.toISOString?.() ?? (row.updated_at as string),
  };
}

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(
    facilityId: string,
    userId: string,
    dto: CreateActivityDto,
  ): Promise<ActivitySession> {
    const sql = `
      INSERT INTO activity_sessions
        (facility_id, title, description, start_time, location,
         participants, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
    `;
    const params = [
      facilityId,
      dto.title,
      dto.description ?? null,
      dto.startTime,
      dto.location ?? null,
      JSON.stringify(dto.participants ?? []),
      userId,
    ];

    const result: QueryResult = await this.pool.query(sql, params);
    this.logger.log(`Activity created: ${result.rows[0].id}`);
    return rowToActivity(result.rows[0]);
  }

  async findAll(
    facilityId: string,
    filters?: { date?: string; upcoming?: boolean },
  ): Promise<ActivitySession[]> {
    let sql = `SELECT * FROM activity_sessions WHERE facility_id = $1`;
    const params: unknown[] = [facilityId];
    let idx = 2;

    if (filters?.date) {
      sql += ` AND start_time::date = $${idx}`;
      params.push(filters.date);
      idx++;
    }
    if (filters?.upcoming) {
      sql += ` AND start_time >= NOW()`;
    }

    sql += ` ORDER BY start_time ASC`;

    const result: QueryResult = await this.pool.query(sql, params);
    return result.rows.map(rowToActivity);
  }

  async update(
    facilityId: string,
    id: string,
    dto: UpdateActivityDto,
  ): Promise<ActivitySession> {
    const fieldMap: Record<string, unknown> = {
      title: dto.title,
      description: dto.description,
      start_time: dto.startTime,
      location: dto.location,
      participants: dto.participants
        ? JSON.stringify(dto.participants)
        : undefined,
    };

    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    for (const [col, value] of Object.entries(fieldMap)) {
      if (value !== undefined) {
        setClauses.push(`${col} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      const sql = `SELECT * FROM activity_sessions WHERE id = $1 AND facility_id = $2`;
      const result: QueryResult = await this.pool.query(sql, [id, facilityId]);
      if (result.rowCount === 0)
        throw new NotFoundException(`Activity ${id} not found`);
      return rowToActivity(result.rows[0]);
    }

    params.push(id);
    params.push(facilityId);

    const sql = `
      UPDATE activity_sessions
         SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
         AND facility_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result: QueryResult = await this.pool.query(sql, params);
    if (result.rowCount === 0)
      throw new NotFoundException(`Activity ${id} not found`);

    this.logger.log(`Activity ${id} updated`);
    return rowToActivity(result.rows[0]);
  }
}

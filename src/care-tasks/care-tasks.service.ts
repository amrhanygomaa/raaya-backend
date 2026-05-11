/**
 * US-12-05 – CareTasksService
 *
 * Provides:
 *  - Create care task
 *  - List tasks (facility-scoped, filterable by resident, date, category)
 *  - Mark task complete with audit
 */

import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { PG_POOL } from '../database/database.module';
import { CareTask } from './care-tasks.schema';
import { CreateCareTaskDto } from './dto/create-care-task.dto';

function rowToCareTask(row: Record<string, unknown>): CareTask {
  return {
    id: row.id as string,
    facilityId: row.facility_id as string,
    residentId: row.resident_id as string,
    title: row.title as string,
    category: row.category as CareTask['category'],
    scheduledTime: row.scheduled_time
      ? ((row.scheduled_time as Date)?.toISOString?.() ??
        (row.scheduled_time as string))
      : undefined,
    isCompleted: row.is_completed as boolean,
    completedBy: (row.completed_by as string) ?? undefined,
    completedAt: row.completed_at
      ? ((row.completed_at as Date)?.toISOString?.() ??
        (row.completed_at as string))
      : undefined,
    createdAt:
      (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
    updatedAt:
      (row.updated_at as Date)?.toISOString?.() ?? (row.updated_at as string),
  };
}

@Injectable()
export class CareTasksService {
  private readonly logger = new Logger(CareTasksService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(facilityId: string, dto: CreateCareTaskDto): Promise<CareTask> {
    const sql = `
      INSERT INTO care_tasks
        (facility_id, resident_id, title, category, scheduled_time)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
    `;
    const params = [
      facilityId,
      dto.residentId,
      dto.title,
      dto.category ?? 'personal',
      dto.scheduledTime ?? null,
    ];

    const result: QueryResult = await this.pool.query(sql, params);
    const task = rowToCareTask(result.rows[0]);
    this.logger.log(`Care task created: ${task.id}`);
    return task;
  }

  async findAll(
    facilityId: string,
    filters?: { residentId?: string; date?: string; category?: string },
  ): Promise<CareTask[]> {
    let sql = `SELECT * FROM care_tasks WHERE facility_id = $1`;
    const params: unknown[] = [facilityId];
    let idx = 2;

    if (filters?.residentId) {
      sql += ` AND resident_id = $${idx}`;
      params.push(filters.residentId);
      idx++;
    }
    if (filters?.date) {
      sql += ` AND scheduled_time::date = $${idx}`;
      params.push(filters.date);
      idx++;
    }
    if (filters?.category) {
      sql += ` AND category = $${idx}`;
      params.push(filters.category);
      idx++;
    }

    sql += ` ORDER BY scheduled_time ASC NULLS LAST, created_at DESC`;

    const result: QueryResult = await this.pool.query(sql, params);
    return result.rows.map(rowToCareTask);
  }

  async complete(
    facilityId: string,
    id: string,
    userId: string,
  ): Promise<CareTask> {
    const sql = `
      UPDATE care_tasks
         SET is_completed = TRUE,
             completed_by = $1,
             completed_at = NOW()
       WHERE id = $2 AND facility_id = $3
      RETURNING *
    `;
    const result: QueryResult = await this.pool.query(sql, [
      userId,
      id,
      facilityId,
    ]);

    if (result.rowCount === 0) {
      throw new NotFoundException(`Care task ${id} not found`);
    }

    this.logger.log(`Care task ${id} completed by ${userId}`);
    return rowToCareTask(result.rows[0]);
  }
}

/**
 * US-13-03 – MedicalSessionsService
 */

import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { PG_POOL } from '../database/database.module';
import { MedicalSession } from './medical-sessions.schema';
import { CreateMedicalSessionDto } from './dto/create-medical-session.dto';

function rowToSession(row: Record<string, unknown>): MedicalSession {
  return {
    id: row.id as string,
    facilityId: row.facility_id as string,
    residentId: row.resident_id as string,
    type: row.type as MedicalSession['type'],
    specialistName: (row.specialist_name as string) ?? undefined,
    sessionDate:
      (row.session_date as Date)?.toISOString?.().slice(0, 10) ??
      (row.session_date as string),
    sessionTime: (row.session_time as string) ?? undefined,
    notes: (row.notes as string) ?? undefined,
    createdAt:
      (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
  };
}

@Injectable()
export class MedicalSessionsService {
  private readonly logger = new Logger(MedicalSessionsService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(
    facilityId: string,
    dto: CreateMedicalSessionDto,
  ): Promise<MedicalSession> {
    const sql = `
      INSERT INTO medical_sessions
        (facility_id, resident_id, type, specialist_name,
         session_date, session_time, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
    `;
    const params = [
      facilityId,
      dto.residentId,
      dto.type ?? 'doctor',
      dto.specialistName ?? null,
      dto.sessionDate,
      dto.sessionTime ?? null,
      dto.notes ?? null,
    ];

    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, params);
    this.logger.log(`Medical session created: ${String(result.rows[0].id)}`);
    return rowToSession(result.rows[0]);
  }

  async findAll(
    facilityId: string,
    filters?: { residentId?: string; type?: string },
  ): Promise<MedicalSession[]> {
    let sql = `SELECT * FROM medical_sessions WHERE facility_id = $1`;
    const params: unknown[] = [facilityId];
    let idx = 2;

    if (filters?.residentId) {
      sql += ` AND resident_id = $${idx}`;
      params.push(filters.residentId);
      idx++;
    }
    if (filters?.type) {
      sql += ` AND type = $${idx}`;
      params.push(filters.type);
      idx++;
    }

    sql += ` ORDER BY session_date DESC, created_at DESC`;

    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, params);
    return result.rows.map(rowToSession);
  }

  async delete(facilityId: string, id: string): Promise<{ id: string }> {
    const result = await this.pool.query<Record<string, unknown>>(
      `DELETE FROM medical_sessions WHERE id = $1 AND facility_id = $2 RETURNING id`,
      [id, facilityId],
    );

    if (result.rowCount === 0) {
      throw new NotFoundException(`Medical session ${id} not found`);
    }

    this.logger.log(`Medical session deleted: ${id}`);
    return { id };
  }
}

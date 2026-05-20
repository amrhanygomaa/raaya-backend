/**
 * US-12-03 – HandoffsService
 *
 * Provides:
 *  - Create shift handoff
 *  - List handoffs (facility-scoped, filterable by date and nurse)
 *  - Get single handoff
 */

import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { PG_POOL } from '../database/database.module';
import { ShiftHandoff } from './handoffs.schema';
import { CreateHandoffDto } from './dto/create-handoff.dto';

function rowToHandoff(row: Record<string, unknown>): ShiftHandoff {
  return {
    id: row.id as string,
    facilityId: row.facility_id as string,
    outgoingNurseId: row.outgoing_nurse_id as string,
    incomingNurseId: row.incoming_nurse_id as string,
    shiftDate:
      (row.shift_date as Date)?.toISOString?.().slice(0, 10) ??
      (row.shift_date as string),
    shiftType: row.shift_type as ShiftHandoff['shiftType'],
    summary: row.summary as string,
    residentsCovered: (row.residents_covered as unknown[]) ?? [],
    pendingTasks: (row.pending_tasks as unknown[]) ?? [],
    createdAt:
      (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
  };
}

@Injectable()
export class HandoffsService {
  private readonly logger = new Logger(HandoffsService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  // ── CREATE ──────────────────────────────────────────────────────────────

  async create(
    facilityId: string,
    outgoingNurseId: string,
    dto: CreateHandoffDto,
  ): Promise<ShiftHandoff> {
    const sql = `
      INSERT INTO shift_handoffs
        (facility_id, outgoing_nurse_id, incoming_nurse_id,
         shift_date, shift_type, summary, residents_covered, pending_tasks)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `;
    const params = [
      facilityId,
      outgoingNurseId,
      dto.incomingNurseId,
      dto.shiftDate,
      dto.shiftType ?? 'morning',
      dto.summary,
      JSON.stringify(dto.residentsCovered ?? []),
      JSON.stringify(dto.pendingTasks ?? []),
    ];

    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, params);
    const handoff = rowToHandoff(result.rows[0]);
    this.logger.log(`Shift handoff created: ${handoff.id}`);
    return handoff;
  }

  // ── LIST ────────────────────────────────────────────────────────────────

  async findAll(
    facilityId: string,
    filters?: { date?: string; nurseId?: string },
  ): Promise<ShiftHandoff[]> {
    let sql = `SELECT * FROM shift_handoffs WHERE facility_id = $1`;
    const params: unknown[] = [facilityId];
    let idx = 2;

    if (filters?.date) {
      sql += ` AND shift_date = $${idx}`;
      params.push(filters.date);
      idx++;
    }
    if (filters?.nurseId) {
      sql += ` AND (outgoing_nurse_id = $${idx} OR incoming_nurse_id = $${idx})`;
      params.push(filters.nurseId);
      idx++;
    }

    sql += ` ORDER BY created_at DESC`;

    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, params);
    return result.rows.map(rowToHandoff);
  }

  // ── GET BY ID ───────────────────────────────────────────────────────────

  async findOne(facilityId: string, id: string): Promise<ShiftHandoff> {
    const sql = `SELECT * FROM shift_handoffs WHERE id = $1 AND facility_id = $2`;
    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, [id, facilityId]);

    if (result.rowCount === 0) {
      throw new NotFoundException(`Shift handoff ${id} not found`);
    }

    return rowToHandoff(result.rows[0]);
  }
}

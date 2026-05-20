/**
 * US-12-01 – NursingNotesService
 *
 * Provides:
 *  - Create nursing note
 *  - List notes (facility-scoped, filterable by resident and author)
 *  - Get single note
 *  - Update note content
 */

import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { PG_POOL } from '../database/database.module';
import { NursingNote } from './nursing-notes.schema';
import { CreateNursingNoteDto } from './dto/create-nursing-note.dto';
import { UpdateNursingNoteDto } from './dto/update-nursing-note.dto';

function rowToNursingNote(row: Record<string, unknown>): NursingNote {
  return {
    id: row.id as string,
    facilityId: row.facility_id as string,
    residentId: row.resident_id as string,
    authorId: row.author_id as string,
    content: row.content as string,
    category: row.category as NursingNote['category'],
    createdAt:
      (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
    updatedAt:
      (row.updated_at as Date)?.toISOString?.() ?? (row.updated_at as string),
  };
}

@Injectable()
export class NursingNotesService {
  private readonly logger = new Logger(NursingNotesService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  // ── CREATE ──────────────────────────────────────────────────────────────

  async create(
    facilityId: string,
    authorId: string,
    dto: CreateNursingNoteDto,
  ): Promise<NursingNote> {
    const sql = `
      INSERT INTO nursing_notes
        (facility_id, resident_id, author_id, content, category)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
    `;
    const params = [
      facilityId,
      dto.residentId,
      authorId,
      dto.content,
      dto.category ?? 'routine',
    ];

    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, params);
    const note = rowToNursingNote(result.rows[0]);
    this.logger.log(`Nursing note created: ${note.id} by ${authorId}`);
    return note;
  }

  // ── LIST ────────────────────────────────────────────────────────────────

  async findAll(
    facilityId: string,
    filters?: { residentId?: string; authorId?: string },
  ): Promise<NursingNote[]> {
    let sql = `SELECT * FROM nursing_notes WHERE facility_id = $1`;
    const params: unknown[] = [facilityId];
    let idx = 2;

    if (filters?.residentId) {
      sql += ` AND resident_id = $${idx}`;
      params.push(filters.residentId);
      idx++;
    }
    if (filters?.authorId) {
      sql += ` AND author_id = $${idx}`;
      params.push(filters.authorId);
      idx++;
    }

    sql += ` ORDER BY created_at DESC`;

    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, params);
    return result.rows.map(rowToNursingNote);
  }

  // ── GET BY ID ───────────────────────────────────────────────────────────

  async findOne(facilityId: string, id: string): Promise<NursingNote> {
    const sql = `SELECT * FROM nursing_notes WHERE id = $1 AND facility_id = $2`;
    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, [id, facilityId]);

    if (result.rowCount === 0) {
      throw new NotFoundException(`Nursing note ${id} not found`);
    }

    return rowToNursingNote(result.rows[0]);
  }

  // ── UPDATE ──────────────────────────────────────────────────────────────

  async update(
    facilityId: string,
    id: string,
    dto: UpdateNursingNoteDto,
  ): Promise<NursingNote> {
    const fieldMap: Record<string, unknown> = {
      content: dto.content,
      category: dto.category,
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
      return this.findOne(facilityId, id);
    }

    params.push(id);
    params.push(facilityId);

    const sql = `
      UPDATE nursing_notes
         SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
         AND facility_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, params);

    if (result.rowCount === 0) {
      throw new NotFoundException(`Nursing note ${id} not found`);
    }

    this.logger.log(`Nursing note ${id} updated`);
    return rowToNursingNote(result.rows[0]);
  }
}

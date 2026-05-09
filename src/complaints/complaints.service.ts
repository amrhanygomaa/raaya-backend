/**
 * US-07-03 – ComplaintsService
 *
 * Provides:
 *  - Create complaint
 *  - List complaints (facility-scoped, filterable)
 *  - Get single complaint
 *  - Update status with transition validation + audit fields
 *
 * Valid transitions:
 *   open → in_progress | closed
 *   in_progress → resolved | closed
 *   resolved → closed
 *   closed → (none – terminal)
 */

import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { PG_POOL } from '../database/database.module';
import {
  Complaint,
  ComplaintStatus,
  isValidTransition,
  VALID_TRANSITIONS,
} from './complaints.schema';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintStatusDto } from './dto/update-complaint-status.dto';

// ── Row mapper ───────────────────────────────────────────────────────────

function rowToComplaint(row: Record<string, unknown>): Complaint {
  return {
    id: row.id as string,
    residentId: (row.resident_id as string) ?? undefined,
    facilityId: row.facility_id as string,
    submittedBy: row.submitted_by as string,
    category: row.category as Complaint['category'],
    subject: row.subject as string,
    description: (row.description as string) ?? undefined,
    status: row.status as Complaint['status'],
    priority: row.priority as Complaint['priority'],
    resolvedBy: (row.resolved_by as string) ?? undefined,
    resolvedAt:
      row.resolved_at
        ? ((row.resolved_at as Date)?.toISOString?.() ??
          (row.resolved_at as string))
        : undefined,
    resolutionNotes: (row.resolution_notes as string) ?? undefined,
    createdAt:
      (row.created_at as Date)?.toISOString?.() ??
      (row.created_at as string),
    updatedAt:
      (row.updated_at as Date)?.toISOString?.() ??
      (row.updated_at as string),
  };
}

@Injectable()
export class ComplaintsService {
  private readonly logger = new Logger(ComplaintsService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  CREATE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async create(
    facilityId: string,
    userId: string,
    dto: CreateComplaintDto,
  ): Promise<Complaint> {
    const sql = `
      INSERT INTO complaints
        (resident_id, facility_id, submitted_by,
         category, subject, description, priority)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
    `;
    const params = [
      dto.residentId ?? null,
      facilityId,
      userId,
      dto.category,
      dto.subject,
      dto.description ?? null,
      dto.priority ?? 'medium',
    ];

    const result: QueryResult = await this.pool.query(sql, params);
    const complaint = rowToComplaint(result.rows[0]);

    this.logger.log(`Complaint created: ${complaint.id} by ${userId}`);
    return complaint;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  LIST
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async findAll(
    facilityId: string,
    filters?: { status?: string; priority?: string; residentId?: string },
  ): Promise<Complaint[]> {
    let sql = `SELECT * FROM complaints WHERE facility_id = $1`;
    const params: unknown[] = [facilityId];
    let idx = 2;

    if (filters?.status) {
      sql += ` AND status = $${idx}`;
      params.push(filters.status);
      idx++;
    }
    if (filters?.priority) {
      sql += ` AND priority = $${idx}`;
      params.push(filters.priority);
      idx++;
    }
    if (filters?.residentId) {
      sql += ` AND resident_id = $${idx}`;
      params.push(filters.residentId);
      idx++;
    }

    sql += ` ORDER BY created_at DESC`;

    const result: QueryResult = await this.pool.query(sql, params);
    return result.rows.map(rowToComplaint);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  GET BY ID
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async findOne(facilityId: string, id: string): Promise<Complaint> {
    const sql = `SELECT * FROM complaints WHERE id = $1 AND facility_id = $2`;
    const result: QueryResult = await this.pool.query(sql, [id, facilityId]);

    if (result.rowCount === 0) {
      throw new NotFoundException(`Complaint ${id} not found`);
    }

    return rowToComplaint(result.rows[0]);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  UPDATE STATUS (with transition validation + audit)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async updateStatus(
    facilityId: string,
    id: string,
    userId: string,
    dto: UpdateComplaintStatusDto,
  ): Promise<Complaint> {
    // 1. Fetch current complaint
    const current = await this.findOne(facilityId, id);
    const currentStatus = current.status as ComplaintStatus;
    const nextStatus = dto.status as ComplaintStatus;

    // 2. Validate transition
    if (!isValidTransition(currentStatus, nextStatus)) {
      throw new BadRequestException(
        `Invalid transition: ${currentStatus} → ${nextStatus}. ` +
          `Allowed transitions from '${currentStatus}': ${
            VALID_TRANSITIONS[currentStatus].join(', ') || 'none'
          }`,
      );
    }

    // 3. Build audit fields
    const isResolution =
      nextStatus === 'resolved' || nextStatus === 'closed';

    const sql = `
      UPDATE complaints
         SET status = $1,
             resolved_by = CASE WHEN $2 THEN $3 ELSE resolved_by END,
             resolved_at = CASE WHEN $2 AND resolved_at IS NULL THEN NOW() ELSE resolved_at END,
             resolution_notes = COALESCE($4, resolution_notes)
       WHERE id = $5
         AND facility_id = $6
      RETURNING *
    `;
    const result: QueryResult = await this.pool.query(sql, [
      nextStatus,
      isResolution,
      userId,
      dto.resolutionNotes ?? null,
      id,
      facilityId,
    ]);

    const updated = rowToComplaint(result.rows[0]);

    this.logger.log(
      `Complaint ${id}: ${currentStatus} → ${nextStatus} by ${userId}`,
    );

    return updated;
  }
}

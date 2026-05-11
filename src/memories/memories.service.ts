/**
 * US-14-06 – MemoriesService
 *
 * Provides:
 *  - Create memory moment (with optional presigned S3 URL stub)
 *  - List moments (filterable by residentId)
 *  - Appreciate (increment counter)
 */

import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { PG_POOL } from '../database/database.module';
import { MemoryMoment } from './memories.schema';
import { CreateMemoryDto } from './dto/create-memory.dto';

function rowToMoment(row: Record<string, unknown>): MemoryMoment {
  return {
    id: row.id as string,
    facilityId: row.facility_id as string,
    residentId: row.resident_id as string,
    imageUrl: (row.image_url as string) ?? undefined,
    activityTitle: row.activity_title as string,
    appreciations: row.appreciations as number,
    uploadedBy: row.uploaded_by as string,
    createdAt:
      (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
  };
}

@Injectable()
export class MemoriesService {
  private readonly logger = new Logger(MemoriesService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(
    facilityId: string,
    userId: string,
    dto: CreateMemoryDto,
  ): Promise<{ moment: MemoryMoment; uploadUrl?: string }> {
    // In production, generate presigned S3 URL here.
    // For now, store a placeholder image_url if fileName provided.
    const imageUrl = dto.fileName
      ? `https://raaya-media.s3.amazonaws.com/memories/${dto.fileName}`
      : null;

    const sql = `
      INSERT INTO memory_moments
        (facility_id, resident_id, image_url, activity_title, uploaded_by)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
    `;
    const params = [
      facilityId,
      dto.residentId,
      imageUrl,
      dto.activityTitle,
      userId,
    ];

    const result: QueryResult = await this.pool.query(sql, params);
    const moment = rowToMoment(result.rows[0]);
    this.logger.log(`Memory moment created: ${moment.id}`);

    return {
      moment,
      uploadUrl: dto.fileName
        ? `https://raaya-media.s3.amazonaws.com/memories/${dto.fileName}?presigned=stub`
        : undefined,
    };
  }

  async findAll(
    facilityId: string,
    filters?: { residentId?: string },
  ): Promise<MemoryMoment[]> {
    let sql = `SELECT * FROM memory_moments WHERE facility_id = $1`;
    const params: unknown[] = [facilityId];

    if (filters?.residentId) {
      sql += ` AND resident_id = $2`;
      params.push(filters.residentId);
    }

    sql += ` ORDER BY created_at DESC`;

    const result: QueryResult = await this.pool.query(sql, params);
    return result.rows.map(rowToMoment);
  }

  async appreciate(facilityId: string, id: string): Promise<MemoryMoment> {
    const sql = `
      UPDATE memory_moments
         SET appreciations = appreciations + 1
       WHERE id = $1 AND facility_id = $2
      RETURNING *
    `;
    const result: QueryResult = await this.pool.query(sql, [id, facilityId]);

    if (result.rowCount === 0) {
      throw new NotFoundException(`Memory moment ${id} not found`);
    }

    return rowToMoment(result.rows[0]);
  }
}

/**
 * US-14-06 – MemoriesService
 *
 * Provides:
 *  - Create memory moment (with optional presigned S3 upload URL)
 *  - List moments (filterable by residentId)
 *  - Appreciate (increment counter)
 */

import {
  Injectable,
  Inject,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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
  private readonly s3 = new S3Client({
    region: process.env.AWS_REGION ?? 'us-east-1',
  });
  private readonly bucket = process.env.S3_MEDIA_BUCKET;

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(
    facilityId: string,
    userId: string,
    dto: CreateMemoryDto,
  ): Promise<{ moment: MemoryMoment; uploadUrl?: string }> {
    const objectKey = dto.fileName
      ? `memories/${facilityId}/${Date.now()}-${this.cleanFileName(dto.fileName)}`
      : null;
    if (objectKey && !this.bucket) {
      throw new BadRequestException('S3_MEDIA_BUCKET is not configured');
    }
    const imageUrl =
      objectKey && this.bucket ? `s3://${this.bucket}/${objectKey}` : null;

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

    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, params);
    const moment = rowToMoment(result.rows[0]);
    this.logger.log(`Memory moment created: ${moment.id}`);

    return {
      moment,
      uploadUrl:
        objectKey && this.bucket
          ? await getSignedUrl(
              this.s3,
              new PutObjectCommand({
                Bucket: this.bucket,
                Key: objectKey,
              }),
              { expiresIn: 900 },
            )
          : undefined,
    };
  }

  private cleanFileName(fileName: string): string {
    return (
      fileName
        .split(/[\\/]/)
        .pop()
        ?.replace(/[^a-zA-Z0-9._-]/g, '_') ?? 'upload.bin'
    );
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

    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, params);
    return result.rows.map(rowToMoment);
  }

  async appreciate(facilityId: string, id: string): Promise<MemoryMoment> {
    const sql = `
      UPDATE memory_moments
         SET appreciations = appreciations + 1
       WHERE id = $1 AND facility_id = $2
      RETURNING *
    `;
    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, [id, facilityId]);

    if (result.rowCount === 0) {
      throw new NotFoundException(`Memory moment ${id} not found`);
    }

    return rowToMoment(result.rows[0]);
  }

  async delete(facilityId: string, id: string): Promise<{ id: string }> {
    const result = await this.pool.query<Record<string, unknown>>(
      `DELETE FROM memory_moments WHERE id = $1 AND facility_id = $2 RETURNING id`,
      [id, facilityId],
    );

    if (result.rowCount === 0) {
      throw new NotFoundException(`Memory moment ${id} not found`);
    }

    this.logger.log(`Memory moment deleted: ${id}`);
    return { id };
  }
}

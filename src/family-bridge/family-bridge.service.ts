/**
 * US-05-01 – FamilyBridgeService
 *
 * Provides:
 *  - Presigned S3 upload + media confirm/list
 *  - Visit booking, listing, and approval-status updates
 *  - Family-account access check (linked residents only)
 *
 * Every query is facility-scoped via the caller's JWT facilityId.
 */

import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { PG_POOL } from '../database/database.module';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  MediaItem,
  MediaUploadResult,
  Visit,
} from './family-bridge.schema';
import { UploadMediaDto } from './dto/upload-media.dto';
import { ConfirmMediaDto } from './dto/confirm-media.dto';
import { BookVisitDto } from './dto/book-visit.dto';
import { UpdateVisitStatusDto } from './dto/update-visit-status.dto';

// ── Row mappers ──────────────────────────────────────────────────────────

function rowToMedia(row: Record<string, unknown>): MediaItem {
  return {
    id: row.id as string,
    residentId: row.resident_id as string,
    facilityId: row.facility_id as string,
    uploadedBy: row.uploaded_by as string,
    s3Key: row.s3_key as string,
    fileName: row.file_name as string,
    contentType: row.content_type as string,
    fileSizeBytes: row.file_size_bytes
      ? Number(row.file_size_bytes)
      : undefined,
    status: row.status as MediaItem['status'],
    caption: (row.caption as string) ?? undefined,
    createdAt:
      (row.created_at as Date)?.toISOString?.() ??
      (row.created_at as string),
    updatedAt:
      (row.updated_at as Date)?.toISOString?.() ??
      (row.updated_at as string),
  };
}

function rowToVisit(row: Record<string, unknown>): Visit {
  return {
    id: row.id as string,
    residentId: row.resident_id as string,
    facilityId: row.facility_id as string,
    visitorName: row.visitor_name as string,
    visitorRelationship: row.visitor_relationship as string,
    bookedBy: row.booked_by as string,
    visitDate:
      (row.visit_date as Date)?.toISOString?.().slice(0, 10) ??
      (row.visit_date as string),
    visitTimeStart: row.visit_time_start as string,
    visitTimeEnd: row.visit_time_end as string,
    status: row.status as Visit['status'],
    approvedBy: (row.approved_by as string) ?? undefined,
    notes: (row.notes as string) ?? undefined,
    createdAt:
      (row.created_at as Date)?.toISOString?.() ??
      (row.created_at as string),
    updatedAt:
      (row.updated_at as Date)?.toISOString?.() ??
      (row.updated_at as string),
  };
}

@Injectable()
export class FamilyBridgeService {
  private readonly logger = new Logger(FamilyBridgeService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly prefix: string;

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION ?? 'us-east-1',
    });
    this.bucket = process.env.S3_MEDIA_BUCKET ?? 'raaya-demo-media';
    this.prefix = process.env.S3_MEDIA_PREFIX ?? '';
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  FAMILY ACCESS CHECK
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Verifies that a Family-role user is linked to the requested resident
   * via the family_members table (matching by email).
   * Staff roles bypass this check.
   */
  async assertFamilyAccess(
    roles: string[],
    email: string,
    residentId: string,
  ): Promise<void> {
    const isStaff = roles.some((r) =>
      ['Admin', 'Nurse', 'Doctor', 'ClinicalStaff'].includes(r),
    );
    if (isStaff) return;

    const sql = `
      SELECT 1 FROM family_members
      WHERE resident_id = $1 AND email = $2
      LIMIT 1
    `;
    const result: QueryResult = await this.pool.query(sql, [
      residentId,
      email,
    ]);

    if (result.rowCount === 0) {
      throw new ForbiddenException(
        'Family accounts can only access linked residents',
      );
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  MEDIA – PRESIGNED UPLOAD
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async requestUpload(
    facilityId: string,
    userId: string,
    dto: UploadMediaDto,
  ): Promise<MediaUploadResult> {
    const s3Key = [
      this.prefix,
      facilityId,
      dto.residentId,
      `${Date.now()}-${dto.fileName}`,
    ]
      .filter(Boolean)
      .join('/');

    // Insert a pending_upload row
    const sql = `
      INSERT INTO media_items
        (resident_id, facility_id, uploaded_by, s3_key, file_name,
         content_type, status, caption)
      VALUES ($1,$2,$3,$4,$5,$6,'pending_upload',$7)
      RETURNING *
    `;
    const params = [
      dto.residentId,
      facilityId,
      userId,
      s3Key,
      dto.fileName,
      dto.contentType,
      dto.caption ?? null,
    ];

    const result: QueryResult = await this.pool.query(sql, params);
    const media = rowToMedia(result.rows[0]);

    // Generate presigned PUT URL (15-min expiry)
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      ContentType: dto.contentType,
    });
    const presignedUrl = await getSignedUrl(this.s3, command, {
      expiresIn: 900,
    });

    this.logger.log(`Presigned upload created: ${media.id} → s3://${this.bucket}/${s3Key}`);

    return { media, presignedUrl };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  MEDIA – CONFIRM
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async confirmUpload(
    facilityId: string,
    mediaId: string,
    dto: ConfirmMediaDto,
  ): Promise<MediaItem> {
    const sql = `
      UPDATE media_items
         SET status = 'confirmed',
             file_size_bytes = COALESCE($1, file_size_bytes)
       WHERE id = $2
         AND facility_id = $3
         AND status = 'pending_upload'
      RETURNING *
    `;
    const result: QueryResult = await this.pool.query(sql, [
      dto.fileSizeBytes ?? null,
      mediaId,
      facilityId,
    ]);

    if (result.rowCount === 0) {
      throw new NotFoundException(
        `Media ${mediaId} not found or already confirmed`,
      );
    }

    this.logger.log(`Media confirmed: ${mediaId}`);
    return rowToMedia(result.rows[0]);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  MEDIA – LIST
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async findMedia(
    facilityId: string,
    filters?: { residentId?: string; status?: string },
  ): Promise<MediaItem[]> {
    let sql = `SELECT * FROM media_items WHERE facility_id = $1`;
    const params: unknown[] = [facilityId];
    let idx = 2;

    if (filters?.residentId) {
      sql += ` AND resident_id = $${idx}`;
      params.push(filters.residentId);
      idx++;
    }
    if (filters?.status) {
      sql += ` AND status = $${idx}`;
      params.push(filters.status);
      idx++;
    }

    sql += ` ORDER BY created_at DESC`;

    const result: QueryResult = await this.pool.query(sql, params);
    return result.rows.map(rowToMedia);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  VISITS – BOOK
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async bookVisit(
    facilityId: string,
    userId: string,
    dto: BookVisitDto,
  ): Promise<Visit> {
    const sql = `
      INSERT INTO visits
        (resident_id, facility_id, visitor_name, visitor_relationship,
         booked_by, visit_date, visit_time_start, visit_time_end, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `;
    const params = [
      dto.residentId,
      facilityId,
      dto.visitorName,
      dto.visitorRelationship,
      userId,
      dto.visitDate,
      dto.visitTimeStart,
      dto.visitTimeEnd,
      dto.notes ?? null,
    ];

    const result: QueryResult = await this.pool.query(sql, params);
    this.logger.log(
      `Visit booked: ${result.rows[0].id} for resident ${dto.residentId}`,
    );
    return rowToVisit(result.rows[0]);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  VISITS – LIST
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async findVisits(
    facilityId: string,
    filters?: { residentId?: string; status?: string },
  ): Promise<Visit[]> {
    let sql = `SELECT * FROM visits WHERE facility_id = $1`;
    const params: unknown[] = [facilityId];
    let idx = 2;

    if (filters?.residentId) {
      sql += ` AND resident_id = $${idx}`;
      params.push(filters.residentId);
      idx++;
    }
    if (filters?.status) {
      sql += ` AND status = $${idx}`;
      params.push(filters.status);
      idx++;
    }

    sql += ` ORDER BY visit_date DESC, visit_time_start DESC`;

    const result: QueryResult = await this.pool.query(sql, params);
    return result.rows.map(rowToVisit);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  VISITS – UPDATE STATUS (approve / reject / complete / cancel)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async updateVisitStatus(
    facilityId: string,
    visitId: string,
    userId: string,
    dto: UpdateVisitStatusDto,
  ): Promise<Visit> {
    const sql = `
      UPDATE visits
         SET status = $1,
             approved_by = $2,
             notes = COALESCE($3, notes)
       WHERE id = $4
         AND facility_id = $5
      RETURNING *
    `;
    const approvedBy =
      dto.status === 'approved' || dto.status === 'rejected'
        ? userId
        : null;

    const result: QueryResult = await this.pool.query(sql, [
      dto.status,
      approvedBy,
      dto.notes ?? null,
      visitId,
      facilityId,
    ]);

    if (result.rowCount === 0) {
      throw new NotFoundException(`Visit ${visitId} not found`);
    }

    this.logger.log(`Visit ${visitId} → ${dto.status}`);
    return rowToVisit(result.rows[0]);
  }
}

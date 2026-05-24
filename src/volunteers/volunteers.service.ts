/**
 * US-14-03 – VolunteersService
 *
 * Covers: profile CRUD, opportunities list, bookings
 */

import {
  Injectable,
  Inject,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PG_POOL } from '../database/database.module';
import {
  VolunteerProfile,
  VolunteerOpportunity,
  VolunteerBooking,
  VolunteerCertificate,
  VolunteerRating,
  VolunteerReview,
} from './volunteers.schema';
import { UpdateVolunteerProfileDto } from './dto/update-profile.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpsertOpportunityDto } from './dto/upsert-opportunity.dto';

function rowToProfile(row: Record<string, unknown>): VolunteerProfile {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    facilityId: row.facility_id as string,
    name: row.name as string,
    bio: (row.bio as string) ?? undefined,
    location: (row.location as string) ?? undefined,
    skills: (row.skills as string[]) ?? [],
    hoursLogged: row.hours_logged as number,
    socialLinks: (row.social_links as Record<string, string>) ?? {},
    cvFileUrl: (row.cv_file_url as string) ?? undefined,
    createdAt:
      (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
    updatedAt:
      (row.updated_at as Date)?.toISOString?.() ?? (row.updated_at as string),
  };
}

function rowToOpportunity(row: Record<string, unknown>): VolunteerOpportunity {
  return {
    id: row.id as string,
    facilityId: row.facility_id as string,
    title: row.title as string,
    org: (row.org as string) ?? undefined,
    hours: row.hours as number,
    points: row.points as number,
    tags: (row.tags as string[]) ?? [],
    description: (row.description as string) ?? undefined,
    totalSlots: row.total_slots as number,
    filledSlots: row.filled_slots as number,
    dateInfo: (row.date_info as string) ?? undefined,
    createdAt:
      (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
  };
}

function rowToBooking(row: Record<string, unknown>): VolunteerBooking {
  return {
    id: row.id as string,
    facilityId: row.facility_id as string,
    volunteerId: row.volunteer_id as string,
    opportunityId: row.opportunity_id as string,
    status: row.status as VolunteerBooking['status'],
    createdAt:
      (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
    title: (row.title as string) ?? undefined,
    timeInfo: (row.date_info as string) ?? undefined,
    location: (row.org as string) ?? undefined,
    points: row.points === undefined ? undefined : Number(row.points),
    hours: row.hours === undefined ? undefined : Number(row.hours),
    description: (row.description as string) ?? undefined,
    tags: (row.tags as string[]) ?? undefined,
  };
}

@Injectable()
export class VolunteersService {
  private readonly logger = new Logger(VolunteersService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  // ── PROFILE ─────────────────────────────────────────────────────────────

  async getProfile(
    facilityId: string,
    userId: string,
  ): Promise<VolunteerProfile> {
    const sql = `SELECT * FROM volunteer_profiles WHERE user_id = $1 AND facility_id = $2`;
    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, [userId, facilityId]);

    if (result.rowCount === 0) {
      throw new NotFoundException('Volunteer profile not found');
    }

    return rowToProfile(result.rows[0]);
  }

  async upsertProfile(
    facilityId: string,
    userId: string,
    dto: UpdateVolunteerProfileDto,
  ): Promise<VolunteerProfile> {
    const sql = `
      INSERT INTO volunteer_profiles
        (user_id, facility_id, name, bio, location, skills, social_links, cv_file_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (user_id) DO UPDATE SET
        name = COALESCE($3, volunteer_profiles.name),
        bio = COALESCE($4, volunteer_profiles.bio),
        location = COALESCE($5, volunteer_profiles.location),
        skills = COALESCE($6, volunteer_profiles.skills),
        social_links = COALESCE($7, volunteer_profiles.social_links),
        cv_file_url = COALESCE($8, volunteer_profiles.cv_file_url)
      RETURNING *
    `;
    const params = [
      userId,
      facilityId,
      dto.name ?? 'Volunteer',
      dto.bio ?? null,
      dto.location ?? null,
      JSON.stringify(dto.skills ?? []),
      JSON.stringify(dto.socialLinks ?? {}),
      dto.cvFileUrl ?? null,
    ];

    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, params);
    this.logger.log(`Volunteer profile upserted for ${userId}`);
    return rowToProfile(result.rows[0]);
  }

  // ── OPPORTUNITIES ───────────────────────────────────────────────────────

  async getOpportunities(facilityId: string): Promise<VolunteerOpportunity[]> {
    const sql = `
      SELECT * FROM volunteer_opportunities
       WHERE facility_id = $1
       ORDER BY created_at DESC
    `;
    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, [facilityId]);
    return result.rows.map(rowToOpportunity);
  }

  async createOpportunity(
    facilityId: string,
    dto: UpsertOpportunityDto,
  ): Promise<VolunteerOpportunity> {
    const sql = `
      INSERT INTO volunteer_opportunities
        (facility_id, title, org, hours, points, tags, description, total_slots, date_info)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `;
    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, [
      facilityId,
      dto.title,
      dto.org ?? null,
      dto.hours ?? 0,
      dto.points ?? 0,
      JSON.stringify(dto.tags ?? []),
      dto.description ?? null,
      dto.totalSlots ?? 1,
      dto.dateInfo ?? null,
    ]);
    return rowToOpportunity(result.rows[0]);
  }

  async updateOpportunity(
    facilityId: string,
    id: string,
    dto: UpsertOpportunityDto,
  ): Promise<VolunteerOpportunity> {
    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(
      `
        UPDATE volunteer_opportunities
           SET title = $1,
               org = $2,
               hours = $3,
               points = $4,
               tags = $5,
               description = $6,
               total_slots = $7,
               date_info = $8
         WHERE id = $9 AND facility_id = $10
         RETURNING *
      `,
      [
        dto.title,
        dto.org ?? null,
        dto.hours ?? 0,
        dto.points ?? 0,
        JSON.stringify(dto.tags ?? []),
        dto.description ?? null,
        dto.totalSlots ?? 1,
        dto.dateInfo ?? null,
        id,
        facilityId,
      ],
    );
    if (result.rowCount === 0) {
      throw new NotFoundException(`Opportunity ${id} not found`);
    }
    return rowToOpportunity(result.rows[0]);
  }

  async deleteOpportunity(
    facilityId: string,
    id: string,
  ): Promise<{ id: string }> {
    const result = await this.pool.query<Record<string, unknown>>(
      `DELETE FROM volunteer_opportunities
        WHERE id = $1 AND facility_id = $2
        RETURNING id`,
      [id, facilityId],
    );
    if (result.rowCount === 0) {
      throw new NotFoundException(`Opportunity ${id} not found`);
    }
    return { id };
  }

  // ── BOOKINGS ────────────────────────────────────────────────────────────

  async createBooking(
    facilityId: string,
    userId: string,
    dto: CreateBookingDto,
  ): Promise<VolunteerBooking> {
    // Get or create profile
    let profile: VolunteerProfile;
    try {
      profile = await this.getProfile(facilityId, userId);
    } catch {
      profile = await this.upsertProfile(facilityId, userId, {
        name: 'Volunteer',
      });
    }

    const existing = await this.pool.query<Record<string, unknown>>(
      `
        SELECT b.*, o.title, o.org, o.date_info, o.points, o.hours, o.description, o.tags
          FROM volunteer_bookings b
          JOIN volunteer_opportunities o ON o.id = b.opportunity_id
         WHERE b.facility_id = $1
           AND b.volunteer_id = $2
           AND b.opportunity_id = $3
           AND b.status IN ('pending', 'confirmed')
         LIMIT 1
      `,
      [facilityId, profile.id, dto.opportunityId],
    );
    if (existing.rowCount) {
      return rowToBooking(existing.rows[0]);
    }

    const opportunity = await this.pool.query<Record<string, unknown>>(
      `
        SELECT id, total_slots, filled_slots
          FROM volunteer_opportunities
         WHERE id = $1 AND facility_id = $2
      `,
      [dto.opportunityId, facilityId],
    );
    if (opportunity.rowCount === 0) {
      throw new NotFoundException(`Opportunity ${dto.opportunityId} not found`);
    }
    if (
      Number(opportunity.rows[0].filled_slots) >=
      Number(opportunity.rows[0].total_slots)
    ) {
      throw new BadRequestException('Volunteer opportunity is fully booked');
    }

    const sql = `
      INSERT INTO volunteer_bookings
        (facility_id, volunteer_id, opportunity_id, status)
      VALUES ($1,$2,$3,'confirmed')
      RETURNING *
    `;
    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, [facilityId, profile.id, dto.opportunityId]);

    // Increment filled_slots
    await this.pool.query<Record<string, unknown>>(
      `UPDATE volunteer_opportunities SET filled_slots = filled_slots + 1 WHERE id = $1`,
      [dto.opportunityId],
    );

    this.logger.log(`Booking created: ${String(result.rows[0].id)}`);
    const enriched = await this.getBookingById(
      facilityId,
      userId,
      String(result.rows[0].id),
    );
    return enriched;
  }

  async getBookings(
    facilityId: string,
    userId: string,
  ): Promise<VolunteerBooking[]> {
    const sql = `
      SELECT b.*, o.title, o.org, o.date_info, o.points, o.hours, o.description, o.tags
        FROM volunteer_bookings b
        JOIN volunteer_profiles p ON p.id = b.volunteer_id
        JOIN volunteer_opportunities o ON o.id = b.opportunity_id
       WHERE b.facility_id = $1 AND p.user_id = $2
       ORDER BY b.created_at DESC
    `;
    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, [facilityId, userId]);
    return result.rows.map(rowToBooking);
  }

  private async getBookingById(
    facilityId: string,
    userId: string,
    bookingId: string,
  ): Promise<VolunteerBooking> {
    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(
      `
        SELECT b.*, o.title, o.org, o.date_info, o.points, o.hours, o.description, o.tags
          FROM volunteer_bookings b
          JOIN volunteer_profiles p ON p.id = b.volunteer_id
          JOIN volunteer_opportunities o ON o.id = b.opportunity_id
         WHERE b.id = $1
           AND b.facility_id = $2
           AND p.user_id = $3
      `,
      [bookingId, facilityId, userId],
    );
    if (result.rowCount === 0) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }
    return rowToBooking(result.rows[0]);
  }

  async updateBookingStatus(
    facilityId: string,
    userId: string,
    bookingId: string,
    status: VolunteerBooking['status'],
  ): Promise<VolunteerBooking> {
    const current = await this.getBookingById(facilityId, userId, bookingId);
    if (current.status === status) {
      return current;
    }
    if (
      status === 'cancelled' &&
      current.status !== 'pending' &&
      current.status !== 'confirmed'
    ) {
      throw new BadRequestException('Only active bookings can be cancelled');
    }
    if (
      status === 'done' &&
      current.status !== 'pending' &&
      current.status !== 'confirmed'
    ) {
      throw new BadRequestException('Only active bookings can be completed');
    }

    const sql = `
      UPDATE volunteer_bookings b
         SET status = $1
        FROM volunteer_profiles p
       WHERE b.id = $2
         AND b.facility_id = $3
         AND b.volunteer_id = p.id
         AND p.user_id = $4
       RETURNING b.*
    `;
    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, [status, bookingId, facilityId, userId]);

    if (result.rowCount === 0) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    if (status === 'cancelled') {
      await this.pool.query<Record<string, unknown>>(
        `
          UPDATE volunteer_opportunities
             SET filled_slots = GREATEST(filled_slots - 1, 0)
           WHERE id = $1
        `,
        [result.rows[0].opportunity_id],
      );
    }

    if (status === 'done') {
      await this.pool.query<Record<string, unknown>>(
        `
          UPDATE volunteer_profiles p
             SET hours_logged = hours_logged + o.hours
            FROM volunteer_opportunities o
           WHERE p.id = $1
             AND o.id = $2
        `,
        [result.rows[0].volunteer_id, result.rows[0].opportunity_id],
      );
    }

    this.logger.log(`Booking ${bookingId} updated to ${status}`);
    return this.getBookingById(facilityId, userId, bookingId);
  }

  // ── CERTIFICATES (US-14-04) ─────────────────────────────────────────────

  async getCertificates(
    facilityId: string,
    userId: string,
  ): Promise<VolunteerCertificate[]> {
    const profile = await this.getProfile(facilityId, userId);
    const sql = `SELECT * FROM volunteer_certificates WHERE volunteer_id = $1 ORDER BY award_date DESC`;
    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, [profile.id]);
    return result.rows.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      volunteerId: r.volunteer_id as string,
      name: r.name as string,
      awardDate: r.award_date
        ? ((r.award_date as Date)?.toISOString?.().slice(0, 10) ??
          (r.award_date as string))
        : undefined,
      description: (r.description as string) ?? undefined,
      isLocked: r.is_locked as boolean,
      progress: r.progress as number,
    }));
  }

  // ── RATINGS (US-14-04) ──────────────────────────────────────────────────

  async getRatings(
    facilityId: string,
    userId: string,
  ): Promise<VolunteerRating[]> {
    const profile = await this.getProfile(facilityId, userId);
    const sql = `SELECT * FROM volunteer_ratings WHERE volunteer_id = $1 ORDER BY date DESC`;
    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, [profile.id]);
    return result.rows.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      volunteerId: r.volunteer_id as string,
      fromName: r.from_name as string,
      category: (r.category as string) ?? undefined,
      score: Number(r.score),
      comment: (r.comment as string) ?? undefined,
      date:
        (r.date as Date)?.toISOString?.().slice(0, 10) ?? (r.date as string),
      chips: (r.chips as string[]) ?? [],
      criteriaScores: (r.criteria_scores as Record<string, number>) ?? {},
    }));
  }

  // ── REVIEWS (US-14-04) ──────────────────────────────────────────────────

  async createReview(
    facilityId: string,
    userId: string,
    dto: CreateReviewDto,
  ): Promise<VolunteerReview> {
    let profile: VolunteerProfile;
    try {
      profile = await this.getProfile(facilityId, userId);
    } catch {
      profile = await this.upsertProfile(facilityId, userId, {
        name: 'Reviewer',
      });
    }
    const sql = `
      INSERT INTO volunteer_reviews
        (volunteer_id, to_name, session, score)
      VALUES ($1,$2,$3,$4)
      RETURNING *
    `;
    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, [profile.id, dto.toName, dto.session ?? null, dto.score]);
    const r = result.rows[0];
    return {
      id: r.id as string,
      volunteerId: r.volunteer_id as string,
      toName: r.to_name as string,
      session: (r.session as string) ?? undefined,
      date:
        (r.date as Date)?.toISOString?.().slice(0, 10) ?? (r.date as string),
      score: Number(r.score),
      isPending: r.is_pending as boolean,
    };
  }

  async getReviews(
    facilityId: string,
    userId: string,
  ): Promise<VolunteerReview[]> {
    const profile = await this.getProfile(facilityId, userId);
    const sql = `SELECT * FROM volunteer_reviews WHERE volunteer_id = $1 ORDER BY date DESC`;
    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, [profile.id]);
    return result.rows.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      volunteerId: r.volunteer_id as string,
      toName: r.to_name as string,
      session: (r.session as string) ?? undefined,
      date:
        (r.date as Date)?.toISOString?.().slice(0, 10) ?? (r.date as string),
      score: Number(r.score),
      isPending: r.is_pending as boolean,
    }));
  }

  async createPublicProfileLink(
    facilityId: string,
    userId: string,
  ): Promise<{ url: string; token: string; expiresAt: string }> {
    // Ensure the volunteer has a profile
    await this.getProfile(facilityId, userId);

    const token = `${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;

    const ttlDays = Number(process.env.VOLUNTEER_PUBLIC_LINK_TTL_DAYS ?? 30);
    const result = await this.pool.query<Record<string, unknown>>(
      `INSERT INTO volunteer_public_links (token, user_id, facility_id, expires_at)
       VALUES ($1, $2, $3, NOW() + ($4 || ' days')::interval)
       RETURNING token, expires_at`,
      [token, userId, facilityId, String(ttlDays)],
    );

    const base = (
      process.env.VOLUNTEER_PUBLIC_BASE_URL ?? 'https://app.helpers-tech.com/v'
    ).replace(/\/$/, '');
    const url = `${base}/${token}`;
    const expiresAt =
      (result.rows[0].expires_at as Date)?.toISOString?.() ??
      (result.rows[0].expires_at as string);

    this.logger.log(`Volunteer public link created: ${userId} → ${token}`);
    return { url, token, expiresAt };
  }

  // ── DOCUMENTS (P12) ────────────────────────────────────────────────────────

  private get s3Client(): S3Client {
    return new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
  }

  async requestDocumentUpload(
    facilityId: string,
    userId: string,
    body: { documentType: string; fileName: string; contentType: string },
  ): Promise<{
    id: string;
    documentType: string;
    fileName: string;
    contentType: string;
    status: string;
    uploadUrl: string;
    s3Key: string;
  }> {
    const bucket = process.env.S3_MEDIA_BUCKET ?? 'raaya-demo-media';
    const prefix = process.env.S3_MEDIA_PREFIX ?? '';
    const safeName = (body.fileName || 'document').replace(/[^\w.-]/g, '_');
    const s3Key = [
      prefix,
      facilityId,
      'volunteers',
      userId,
      'documents',
      `${Date.now()}-${safeName}`,
    ]
      .filter(Boolean)
      .join('/');

    const result = await this.pool.query<Record<string, unknown>>(
      `INSERT INTO volunteer_documents
        (facility_id, user_id, document_type, file_name, content_type, s3_key, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [
        facilityId,
        userId,
        body.documentType,
        body.fileName,
        body.contentType,
        s3Key,
      ],
    );

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      ContentType: body.contentType || 'application/octet-stream',
    });
    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 900,
    });

    return {
      id: result.rows[0].id as string,
      documentType: result.rows[0].document_type as string,
      fileName: result.rows[0].file_name as string,
      contentType: result.rows[0].content_type as string,
      status: result.rows[0].status as string,
      s3Key,
      uploadUrl,
    };
  }

  async confirmDocumentUpload(
    facilityId: string,
    userId: string,
    documentId: string,
  ): Promise<{
    id: string;
    documentType: string;
    fileName: string;
    contentType: string;
    status: string;
    fileUrl: string | null;
  }> {
    const result = await this.pool.query<Record<string, unknown>>(
      `UPDATE volunteer_documents
       SET status = 'confirmed', confirmed_at = NOW()
       WHERE id = $1 AND facility_id = $2 AND user_id = $3 AND status = 'pending'
       RETURNING *`,
      [documentId, facilityId, userId],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException(
        'Document upload not found or already confirmed',
      );
    }

    const row = result.rows[0];
    const publicBase = process.env.S3_MEDIA_PUBLIC_BASE_URL;
    let fileUrl = (row.file_url as string | null) ?? null;
    if (!fileUrl && publicBase) {
      fileUrl = `${publicBase.replace(/\/$/, '')}/${row.s3_key as string}`;
      await this.pool.query(
        `UPDATE volunteer_documents SET file_url = $1 WHERE id = $2`,
        [fileUrl, documentId],
      );
    }

    return {
      id: row.id as string,
      documentType: row.document_type as string,
      fileName: row.file_name as string,
      contentType: row.content_type as string,
      status: row.status as string,
      fileUrl,
    };
  }
}

/**
 * US-14-03 – VolunteersService
 *
 * Covers: profile CRUD, opportunities list, bookings
 */

import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
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
    const result: QueryResult = await this.pool.query(sql, [
      userId,
      facilityId,
    ]);

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

    const result: QueryResult = await this.pool.query(sql, params);
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
    const result: QueryResult = await this.pool.query(sql, [facilityId]);
    return result.rows.map(rowToOpportunity);
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

    const sql = `
      INSERT INTO volunteer_bookings
        (facility_id, volunteer_id, opportunity_id)
      VALUES ($1,$2,$3)
      RETURNING *
    `;
    const result: QueryResult = await this.pool.query(sql, [
      facilityId,
      profile.id,
      dto.opportunityId,
    ]);

    // Increment filled_slots
    await this.pool.query(
      `UPDATE volunteer_opportunities SET filled_slots = filled_slots + 1 WHERE id = $1`,
      [dto.opportunityId],
    );

    this.logger.log(`Booking created: ${result.rows[0].id}`);
    return rowToBooking(result.rows[0]);
  }

  async getBookings(
    facilityId: string,
    userId: string,
  ): Promise<VolunteerBooking[]> {
    const sql = `
      SELECT b.* FROM volunteer_bookings b
        JOIN volunteer_profiles p ON p.id = b.volunteer_id
       WHERE b.facility_id = $1 AND p.user_id = $2
       ORDER BY b.created_at DESC
    `;
    const result: QueryResult = await this.pool.query(sql, [
      facilityId,
      userId,
    ]);
    return result.rows.map(rowToBooking);
  }

  // ── CERTIFICATES (US-14-04) ─────────────────────────────────────────────

  async getCertificates(
    facilityId: string,
    userId: string,
  ): Promise<VolunteerCertificate[]> {
    const profile = await this.getProfile(facilityId, userId);
    const sql = `SELECT * FROM volunteer_certificates WHERE volunteer_id = $1 ORDER BY award_date DESC`;
    const result: QueryResult = await this.pool.query(sql, [profile.id]);
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
    const result: QueryResult = await this.pool.query(sql, [profile.id]);
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
    const profile = await this.getProfile(facilityId, userId);
    const sql = `
      INSERT INTO volunteer_reviews
        (volunteer_id, to_name, session, score)
      VALUES ($1,$2,$3,$4)
      RETURNING *
    `;
    const result: QueryResult = await this.pool.query(sql, [
      profile.id,
      dto.toName,
      dto.session ?? null,
      dto.score,
    ]);
    const r = result.rows[0] as Record<string, unknown>;
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
    const result: QueryResult = await this.pool.query(sql, [profile.id]);
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
}

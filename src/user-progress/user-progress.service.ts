import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { AddPointsDto } from './dto/add-points.dto';

export interface UserProgress {
  id: string;
  userId: string;
  points: number;
  streakDays: number;
  completedActivities: number;
  lastActivityAt: string | null;
}

function rowToProgress(row: Record<string, unknown>): UserProgress {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    points: Number(row.points ?? 0),
    streakDays: Number(row.streak_days ?? 0),
    completedActivities: Number(row.completed_activities ?? 0),
    lastActivityAt:
      (row.last_activity_at as Date)?.toISOString?.() ??
      (row.last_activity_at as string | null) ??
      null,
  };
}

@Injectable()
export class UserProgressService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getOrCreate(facilityId: string, userId: string): Promise<UserProgress> {
    const result = await this.pool.query<Record<string, unknown>>(
      `INSERT INTO user_progress (user_id, facility_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET facility_id = EXCLUDED.facility_id
       RETURNING *`,
      [userId, facilityId],
    );
    return rowToProgress(result.rows[0]);
  }

  async addPoints(
    facilityId: string,
    userId: string,
    dto: AddPointsDto,
  ): Promise<UserProgress> {
    await this.getOrCreate(facilityId, userId);

    const completedDelta = dto.completedActivitiesDelta ?? 1;

    const result = await this.pool.query<Record<string, unknown>>(
      `UPDATE user_progress
       SET points               = points + $1,
           completed_activities = completed_activities + $2,
           streak_days          = COALESCE($3, streak_days),
           last_activity_at     = NOW(),
           updated_at           = NOW()
       WHERE user_id = $4
       RETURNING *`,
      [dto.points, completedDelta, dto.streakDays ?? null, userId],
    );
    return rowToProgress(result.rows[0]);
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

export interface UserPreferences {
  preferences: Record<string, unknown>;
}

function rowToPrefs(row: Record<string, unknown>): UserPreferences {
  const raw = row.preferences;
  const prefs =
    raw && typeof raw === 'object'
      ? (raw as Record<string, unknown>)
      : ({} as Record<string, unknown>);
  return { preferences: prefs };
}

@Injectable()
export class UserPreferencesService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getMine(facilityId: string, userId: string): Promise<UserPreferences> {
    const result = await this.pool.query<Record<string, unknown>>(
      `SELECT preferences FROM user_preferences WHERE user_id = $1`,
      [userId],
    );
    if (result.rows.length === 0) {
      // Auto-create empty row so future updates have a target
      await this.pool.query(
        `INSERT INTO user_preferences (user_id, facility_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, facilityId],
      );
      return { preferences: {} };
    }
    return rowToPrefs(result.rows[0]);
  }

  async upsert(
    facilityId: string,
    userId: string,
    dto: UpdatePreferencesDto,
  ): Promise<UserPreferences> {
    const result = await this.pool.query<Record<string, unknown>>(
      `INSERT INTO user_preferences (user_id, facility_id, preferences, updated_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET preferences = EXCLUDED.preferences,
             facility_id = EXCLUDED.facility_id,
             updated_at  = NOW()
       RETURNING preferences`,
      [userId, facilityId, JSON.stringify(dto.preferences ?? {})],
    );
    return rowToPrefs(result.rows[0]);
  }
}

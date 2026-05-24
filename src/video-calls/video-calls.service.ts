import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { CreateVideoCallDto } from './dto/create-video-call.dto';
import { UpdateVideoCallStatusDto } from './dto/update-video-call-status.dto';

export interface VideoCall {
  id: string;
  facilityId: string;
  residentId: string | null;
  callerId: string;
  calleeId: string | null;
  calleeName: string | null;
  provider: string;
  joinUrl: string | null;
  callType: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
}

function rowToCall(row: Record<string, unknown>): VideoCall {
  return {
    id: row.id as string,
    facilityId: row.facility_id as string,
    residentId: (row.resident_id as string | null) ?? null,
    callerId: row.caller_id as string,
    calleeId: (row.callee_id as string | null) ?? null,
    calleeName: (row.callee_name as string | null) ?? null,
    provider: row.provider as string,
    joinUrl: (row.join_url as string | null) ?? null,
    callType: row.call_type as string,
    status: row.status as string,
    startedAt:
      (row.started_at as Date)?.toISOString?.() ?? (row.started_at as string),
    endedAt:
      (row.ended_at as Date)?.toISOString?.() ??
      (row.ended_at as string | null) ??
      null,
  };
}

@Injectable()
export class VideoCallsService {
  private readonly logger = new Logger(VideoCallsService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(
    facilityId: string,
    callerId: string,
    dto: CreateVideoCallDto,
  ): Promise<VideoCall> {
    const result = await this.pool.query<Record<string, unknown>>(
      `INSERT INTO video_calls
         (facility_id, resident_id, caller_id, callee_id, callee_name,
          provider, join_url, call_type, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ringing')
       RETURNING *`,
      [
        facilityId,
        dto.residentId ?? null,
        callerId,
        dto.calleeId ?? null,
        dto.calleeName ?? null,
        dto.provider ?? 'zoom',
        dto.joinUrl ?? null,
        dto.callType,
      ],
    );
    return rowToCall(result.rows[0]);
  }

  async findActive(facilityId: string): Promise<VideoCall[]> {
    const result = await this.pool.query<Record<string, unknown>>(
      `SELECT * FROM video_calls
       WHERE facility_id = $1 AND status IN ('ringing','active')
       ORDER BY started_at DESC`,
      [facilityId],
    );
    return result.rows.map(rowToCall);
  }

  async updateStatus(
    facilityId: string,
    id: string,
    dto: UpdateVideoCallStatusDto,
  ): Promise<VideoCall> {
    const terminal = ['ended', 'missed', 'declined'].includes(dto.status);
    const result = await this.pool.query<Record<string, unknown>>(
      `UPDATE video_calls
       SET status = $1,
           ended_at = CASE WHEN $2::boolean AND ended_at IS NULL THEN NOW() ELSE ended_at END
       WHERE id = $3 AND facility_id = $4
       RETURNING *`,
      [dto.status, terminal, id, facilityId],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Video call not found');
    }
    return rowToCall(result.rows[0]);
  }

  async findHistory(facilityId: string, userId?: string): Promise<VideoCall[]> {
    if (userId && userId.trim().length > 0) {
      const result = await this.pool.query<Record<string, unknown>>(
        `SELECT * FROM video_calls
         WHERE facility_id = $1
           AND (caller_id = $2 OR callee_id = $2)
         ORDER BY started_at DESC
         LIMIT 200`,
        [facilityId, userId],
      );
      return result.rows.map(rowToCall);
    }

    const result = await this.pool.query<Record<string, unknown>>(
      `SELECT * FROM video_calls
       WHERE facility_id = $1
       ORDER BY started_at DESC
       LIMIT 200`,
      [facilityId],
    );
    return result.rows.map(rowToCall);
  }
}

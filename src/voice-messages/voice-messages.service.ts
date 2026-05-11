/**
 * US-15-01 – VoiceMessagesService
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { PG_POOL } from '../database/database.module';
import { VoiceMessage } from './voice-messages.schema';
import { CreateVoiceMessageDto } from './dto/create-voice-message.dto';

function rowToVoiceMessage(row: Record<string, unknown>): VoiceMessage {
  return {
    id: row.id as string,
    facilityId: row.facility_id as string,
    residentId: row.resident_id as string,
    senderType: row.sender_type as VoiceMessage['senderType'],
    title: row.title as string,
    audioUrl: (row.audio_url as string) ?? undefined,
    durationSeconds: row.duration_seconds as number,
    createdAt:
      (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
  };
}

@Injectable()
export class VoiceMessagesService {
  private readonly logger = new Logger(VoiceMessagesService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(
    facilityId: string,
    dto: CreateVoiceMessageDto,
  ): Promise<{ message: VoiceMessage; uploadUrl?: string }> {
    const audioUrl = dto.fileName
      ? `https://raaya-media.s3.amazonaws.com/voice/${dto.fileName}`
      : null;

    const sql = `
      INSERT INTO voice_messages
        (facility_id, resident_id, sender_type, title, audio_url, duration_seconds)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
    `;
    const params = [
      facilityId,
      dto.residentId,
      dto.senderType,
      dto.title,
      audioUrl,
      dto.durationSeconds ?? 0,
    ];

    const result: QueryResult = await this.pool.query(sql, params);
    const message = rowToVoiceMessage(result.rows[0]);
    this.logger.log(`Voice message created: ${message.id}`);

    return {
      message,
      uploadUrl: dto.fileName
        ? `https://raaya-media.s3.amazonaws.com/voice/${dto.fileName}?presigned=stub`
        : undefined,
    };
  }

  async findAll(
    facilityId: string,
    filters?: { residentId?: string },
  ): Promise<VoiceMessage[]> {
    let sql = `SELECT * FROM voice_messages WHERE facility_id = $1`;
    const params: unknown[] = [facilityId];

    if (filters?.residentId) {
      sql += ` AND resident_id = $2`;
      params.push(filters.residentId);
    }

    sql += ` ORDER BY created_at DESC`;

    const result: QueryResult = await this.pool.query(sql, params);
    return result.rows.map(rowToVoiceMessage);
  }
}

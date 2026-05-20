/**
 * US-15-01 – VoiceMessagesService
 */

import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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
  private readonly s3 = new S3Client({
    region: process.env.AWS_REGION ?? 'us-east-1',
  });
  private readonly bucket = process.env.S3_MEDIA_BUCKET;

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(
    facilityId: string,
    dto: CreateVoiceMessageDto,
  ): Promise<{ message: VoiceMessage; uploadUrl?: string }> {
    const objectKey = dto.fileName
      ? `voice/${facilityId}/${Date.now()}-${this.cleanFileName(dto.fileName)}`
      : null;
    if (objectKey && !this.bucket) {
      throw new BadRequestException('S3_MEDIA_BUCKET is not configured');
    }
    const audioUrl =
      objectKey && this.bucket ? `s3://${this.bucket}/${objectKey}` : null;

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

    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, params);
    const message = rowToVoiceMessage(result.rows[0]);
    this.logger.log(`Voice message created: ${message.id}`);

    return {
      message,
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
  ): Promise<VoiceMessage[]> {
    let sql = `SELECT * FROM voice_messages WHERE facility_id = $1`;
    const params: unknown[] = [facilityId];

    if (filters?.residentId) {
      sql += ` AND resident_id = $2`;
      params.push(filters.residentId);
    }

    sql += ` ORDER BY created_at DESC`;

    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, params);
    return result.rows.map(rowToVoiceMessage);
  }
}

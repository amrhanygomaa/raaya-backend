import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PG_POOL } from '../database/database.module';
import {
  ConfirmAiMediaDto,
  RequestAiMediaDto,
} from './dto/request-ai-media.dto';

export interface AiMediaItem {
  id: string;
  fileName: string;
  contentType: string;
  status: string;
  s3Key: string;
  mediaUrl: string | null;
  uploadUrl?: string;
}

function rowToItem(
  row: Record<string, unknown>,
  uploadUrl?: string,
): AiMediaItem {
  return {
    id: row.id as string,
    fileName: row.file_name as string,
    contentType: row.content_type as string,
    status: row.status as string,
    s3Key: row.s3_key as string,
    mediaUrl: (row.media_url as string | null) ?? null,
    ...(uploadUrl ? { uploadUrl } : {}),
  };
}

@Injectable()
export class AiMediaService {
  private readonly logger = new Logger(AiMediaService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly prefix: string;
  private readonly publicBaseUrl: string | undefined;

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION ?? 'us-east-1',
    });
    this.bucket = process.env.S3_MEDIA_BUCKET ?? 'raaya-demo-media';
    this.prefix = process.env.S3_MEDIA_PREFIX ?? '';
    this.publicBaseUrl = process.env.S3_MEDIA_PUBLIC_BASE_URL;
  }

  async requestUpload(
    facilityId: string,
    userId: string,
    dto: RequestAiMediaDto,
  ): Promise<AiMediaItem> {
    const safeName = dto.fileName.replace(/[^\w.-]/g, '_');
    const s3Key = [
      this.prefix,
      facilityId,
      'ai',
      userId,
      `${Date.now()}-${safeName}`,
    ]
      .filter(Boolean)
      .join('/');

    const result = await this.pool.query<Record<string, unknown>>(
      `INSERT INTO ai_media
        (facility_id, user_id, resident_id, file_name, content_type, s3_key, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [
        facilityId,
        userId,
        dto.residentId ?? null,
        dto.fileName,
        dto.contentType,
        s3Key,
      ],
    );

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      ContentType: dto.contentType,
    });
    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: 900,
    });

    this.logger.log(
      `AI media presigned: ${String(result.rows[0].id)} → s3://${this.bucket}/${s3Key}`,
    );
    return rowToItem(result.rows[0], uploadUrl);
  }

  async confirmUpload(
    facilityId: string,
    id: string,
    dto: ConfirmAiMediaDto,
  ): Promise<AiMediaItem> {
    const result = await this.pool.query<Record<string, unknown>>(
      `UPDATE ai_media
       SET status       = 'confirmed',
           notes        = COALESCE($1, notes),
           confirmed_at = NOW()
       WHERE id = $2 AND facility_id = $3 AND status = 'pending'
       RETURNING *`,
      [dto.notes ?? null, id, facilityId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('AI media not found or already confirmed');
    }

    const row = result.rows[0];
    const mediaUrl = await getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: row.s3_key as string }),
      { expiresIn: 86400 },
    );
    await this.pool.query(
      `UPDATE ai_media SET media_url = $1 WHERE id = $2`,
      [mediaUrl, id],
    );
    row.media_url = mediaUrl;

    return rowToItem(row);
  }
}

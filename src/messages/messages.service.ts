import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { SendMessageDto } from './dto/send-message.dto';

export interface Message {
  id: string;
  facility_id: string;
  resident_id: string | null;
  sender_id: string;
  sender_role: string;
  recipient_id: string;
  body: string;
  media_url: string | null;
  media_type: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ThreadSummary {
  otherUserId: string;
  otherUserName: string;
  otherUserRole: string;
  lastMessage: Message;
  unreadCount: number;
}

@Injectable()
export class MessagesService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async send(
    facilityId: string,
    senderId: string,
    senderRole: string,
    dto: SendMessageDto,
  ): Promise<Message> {
    const res = await this.pool.query<Message>(
      `INSERT INTO messages (facility_id, resident_id, sender_id, sender_role, recipient_id, body, media_url, media_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        facilityId,
        dto.residentId ?? null,
        senderId,
        senderRole,
        dto.recipientId,
        dto.body,
        dto.mediaUrl ?? null,
        dto.mediaType ?? null,
      ],
    );
    return res.rows[0];
  }

  async getThread(
    facilityId: string,
    userId: string,
    otherUserId: string,
    residentId?: string,
    limit = 50,
  ): Promise<Message[]> {
    const res = await this.pool.query<Message>(
      `SELECT * FROM messages
       WHERE facility_id = $1
         AND (resident_id = $4 OR $4 IS NULL)
         AND (
           (sender_id = $2 AND recipient_id = $3)
           OR (sender_id = $3 AND recipient_id = $2)
         )
       ORDER BY created_at DESC
       LIMIT $5`,
      [facilityId, userId, otherUserId, residentId ?? null, limit],
    );
    return res.rows.reverse();
  }

  async getInbox(
    facilityId: string,
    userId: string,
  ): Promise<ThreadSummary[]> {
    const res = await this.pool.query<{
      other_user_id: string;
      other_user_name: string | null;
      other_user_role: string | null;
      last_message_id: string;
      last_resident_id: string | null;
      last_sender_id: string;
      last_sender_role: string;
      last_recipient_id: string;
      last_body: string;
      last_media_url: string | null;
      last_media_type: string | null;
      last_is_read: boolean;
      last_created_at: string;
      unread_count: string;
    }>(
      `WITH pairs AS (
         SELECT
           CASE WHEN sender_id = $2 THEN recipient_id ELSE sender_id END AS other_user_id,
           m.*
         FROM messages m
         WHERE facility_id = $1
           AND (sender_id = $2 OR recipient_id = $2)
       ),
       latest AS (
         SELECT DISTINCT ON (other_user_id)
           other_user_id,
           id            AS last_message_id,
           resident_id   AS last_resident_id,
           sender_id     AS last_sender_id,
           sender_role   AS last_sender_role,
           recipient_id  AS last_recipient_id,
           body          AS last_body,
           media_url     AS last_media_url,
           media_type    AS last_media_type,
           is_read       AS last_is_read,
           created_at    AS last_created_at
         FROM pairs
         ORDER BY other_user_id, created_at DESC
       ),
       unread AS (
         SELECT sender_id AS other_user_id, COUNT(*)::text AS unread_count
         FROM messages
         WHERE facility_id = $1 AND recipient_id = $2 AND is_read = FALSE
         GROUP BY sender_id
       )
       SELECT
         l.*,
         u.full_name AS other_user_name,
         u.role      AS other_user_role,
         COALESCE(un.unread_count, '0') AS unread_count
       FROM latest l
       LEFT JOIN managed_users u
         ON u.cognito_sub = l.other_user_id AND u.facility_id = $1
       LEFT JOIN unread un ON un.other_user_id = l.other_user_id
       ORDER BY l.last_created_at DESC`,
      [facilityId, userId],
    );

    return res.rows.map((r) => ({
      otherUserId: r.other_user_id,
      otherUserName: r.other_user_name ?? '',
      otherUserRole: r.other_user_role ?? '',
      lastMessage: {
        id: r.last_message_id,
        facility_id: facilityId,
        resident_id: r.last_resident_id,
        sender_id: r.last_sender_id,
        sender_role: r.last_sender_role,
        recipient_id: r.last_recipient_id,
        body: r.last_body,
        media_url: (r.last_media_url as string | null) ?? null,
        media_type: (r.last_media_type as string | null) ?? null,
        is_read: r.last_is_read,
        created_at: r.last_created_at,
      },
      unreadCount: parseInt(r.unread_count, 10) || 0,
    }));
  }

  async markRead(
    facilityId: string,
    recipientId: string,
    senderId: string,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE messages
       SET is_read = TRUE
       WHERE facility_id = $1 AND recipient_id = $2 AND sender_id = $3 AND is_read = FALSE`,
      [facilityId, recipientId, senderId],
    );
  }

  async unreadCount(facilityId: string, userId: string): Promise<number> {
    const res = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM messages
       WHERE facility_id = $1 AND recipient_id = $2 AND is_read = FALSE`,
      [facilityId, userId],
    );
    return parseInt(res.rows[0]?.count ?? '0', 10);
  }
}

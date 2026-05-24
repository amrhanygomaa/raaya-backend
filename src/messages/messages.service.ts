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
  is_read: boolean;
  created_at: string;
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
      `INSERT INTO messages (facility_id, resident_id, sender_id, sender_role, recipient_id, body)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        facilityId,
        dto.residentId ?? null,
        senderId,
        senderRole,
        dto.recipientId,
        dto.body,
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

  async getInbox(facilityId: string, userId: string): Promise<Message[]> {
    const res = await this.pool.query<Message>(
      `SELECT DISTINCT ON (sender_id) *
       FROM messages
       WHERE facility_id = $1 AND recipient_id = $2
       ORDER BY sender_id, created_at DESC`,
      [facilityId, userId],
    );
    return res.rows;
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

/**
 * US-15-07 – NotificationsService
 *
 * Persists notifications to PostgreSQL instead of in-memory array.
 * Provides:
 *  - Create notification
 *  - List notifications for a user (last 20)
 *  - Mark as read
 *  - Delete one/all notifications
 */

import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { PG_POOL } from '../database/database.module';
import { Notification } from './notifications.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';

function rowToNotification(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    facilityId: row.facility_id as string,
    userId: row.user_id as string,
    message: row.message as string,
    type: row.type as Notification['type'],
    read: row.read as boolean,
    createdAt:
      (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
  };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  // ── CREATE ──────────────────────────────────────────────────────────────

  async create(
    facilityId: string,
    dto: CreateNotificationDto,
  ): Promise<Notification> {
    const sql = `
      INSERT INTO notifications (facility_id, user_id, message, type)
      VALUES ($1,$2,$3,$4)
      RETURNING *
    `;
    const params = [facilityId, dto.userId, dto.message, dto.type];

    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, params);
    const notification = rowToNotification(result.rows[0]);
    this.logger.log(
      `Notification created: ${notification.id} for ${dto.userId}`,
    );
    return notification;
  }

  // ── LIST BY USER ────────────────────────────────────────────────────────

  async findByUser(
    facilityId: string,
    userId: string,
  ): Promise<Notification[]> {
    const sql = `
      SELECT * FROM notifications
       WHERE facility_id = $1 AND user_id = $2
       ORDER BY created_at DESC
       LIMIT 20
    `;
    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, [facilityId, userId]);
    return result.rows.map(rowToNotification);
  }

  // ── MARK AS READ ────────────────────────────────────────────────────────

  async markAsRead(
    facilityId: string,
    id: string,
  ): Promise<{ status: string }> {
    const sql = `
      UPDATE notifications SET read = TRUE
       WHERE id = $1 AND facility_id = $2
       RETURNING id
    `;
    const result = await this.pool.query<Record<string, unknown>>(sql, [
      id,
      facilityId,
    ]);
    if (result.rowCount === 0) {
      throw new NotFoundException(`Notification ${id} not found`);
    }
    return { status: 'ok' };
  }

  async deleteOne(
    facilityId: string,
    id: string,
  ): Promise<{ deleted: number }> {
    const result = await this.pool.query<Record<string, unknown>>(
      `DELETE FROM notifications
        WHERE id = $1 AND facility_id = $2
        RETURNING id`,
      [id, facilityId],
    );
    if (result.rowCount === 0) {
      throw new NotFoundException(`Notification ${id} not found`);
    }
    return { deleted: result.rowCount ?? 0 };
  }

  async deleteByUser(
    facilityId: string,
    userId: string,
  ): Promise<{ deleted: number }> {
    const result = await this.pool.query<Record<string, unknown>>(
      `DELETE FROM notifications
        WHERE facility_id = $1 AND user_id = $2
        RETURNING id`,
      [facilityId, userId],
    );
    return { deleted: result.rowCount ?? 0 };
  }
}

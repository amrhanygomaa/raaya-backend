/**
 * US-15-03 – BillingService
 */

import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { PG_POOL } from '../database/database.module';
import { FamilyBill } from './billing.schema';
import { CreateBillDto } from './dto/create-bill.dto';

function rowToBill(row: Record<string, unknown>): FamilyBill {
  return {
    id: row.id as string,
    facilityId: row.facility_id as string,
    residentId: row.resident_id as string,
    title: row.title as string,
    month: row.month as string,
    amount: Number(row.amount),
    isPaid: row.is_paid as boolean,
    dueDate: row.due_date
      ? ((row.due_date as Date)?.toISOString?.().slice(0, 10) ??
        (row.due_date as string))
      : undefined,
    paidAt: row.paid_at
      ? ((row.paid_at as Date)?.toISOString?.() ?? (row.paid_at as string))
      : undefined,
    createdAt:
      (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
  };
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(facilityId: string, dto: CreateBillDto): Promise<FamilyBill> {
    const sql = `
      INSERT INTO family_bills
        (facility_id, resident_id, title, month, amount, due_date)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
    `;
    const params = [
      facilityId,
      dto.residentId,
      dto.title,
      dto.month,
      dto.amount,
      dto.dueDate ?? null,
    ];

    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, params);
    this.logger.log(`Bill created: ${String(result.rows[0].id)}`);
    return rowToBill(result.rows[0]);
  }

  async findAll(
    facilityId: string,
    filters?: { residentId?: string; isPaid?: boolean },
  ): Promise<FamilyBill[]> {
    let sql = `SELECT * FROM family_bills WHERE facility_id = $1`;
    const params: unknown[] = [facilityId];
    let idx = 2;

    if (filters?.residentId) {
      sql += ` AND resident_id = $${idx}`;
      params.push(filters.residentId);
      idx++;
    }
    if (filters?.isPaid !== undefined) {
      sql += ` AND is_paid = $${idx}`;
      params.push(filters.isPaid);
      idx++;
    }

    sql += ` ORDER BY created_at DESC`;

    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, params);
    return result.rows.map(rowToBill);
  }

  async markPaid(facilityId: string, id: string): Promise<FamilyBill> {
    const sql = `
      UPDATE family_bills
         SET is_paid = TRUE, paid_at = NOW()
       WHERE id = $1 AND facility_id = $2
      RETURNING *
    `;
    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(sql, [id, facilityId]);

    if (result.rowCount === 0) {
      throw new NotFoundException(`Bill ${id} not found`);
    }

    this.logger.log(`Bill ${id} marked as paid`);
    return rowToBill(result.rows[0]);
  }
}

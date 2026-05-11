/**
 * US-12-07 – InventoryService
 */

import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { PG_POOL } from '../database/database.module';
import { InventoryItem } from './inventory.schema';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

function rowToItem(row: Record<string, unknown>): InventoryItem {
  return {
    id: row.id as string,
    facilityId: row.facility_id as string,
    name: row.name as string,
    category: row.category as InventoryItem['category'],
    currentStock: row.current_stock as number,
    minRequired: row.min_required as number,
    unit: row.unit as string,
    lastRestockedAt: row.last_restocked_at
      ? ((row.last_restocked_at as Date)?.toISOString?.() ??
        (row.last_restocked_at as string))
      : undefined,
    createdAt:
      (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
    updatedAt:
      (row.updated_at as Date)?.toISOString?.() ?? (row.updated_at as string),
  };
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(
    facilityId: string,
    dto: CreateInventoryItemDto,
  ): Promise<InventoryItem> {
    const sql = `
      INSERT INTO inventory_items
        (facility_id, name, category, current_stock, min_required, unit)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
    `;
    const params = [
      facilityId,
      dto.name,
      dto.category ?? 'supplies',
      dto.currentStock ?? 0,
      dto.minRequired ?? 0,
      dto.unit ?? 'unit',
    ];

    const result: QueryResult = await this.pool.query(sql, params);
    this.logger.log(`Inventory item created: ${result.rows[0].id}`);
    return rowToItem(result.rows[0]);
  }

  async findAll(
    facilityId: string,
    filters?: { category?: string },
  ): Promise<InventoryItem[]> {
    let sql = `SELECT * FROM inventory_items WHERE facility_id = $1`;
    const params: unknown[] = [facilityId];

    if (filters?.category) {
      sql += ` AND category = $2`;
      params.push(filters.category);
    }

    sql += ` ORDER BY name`;

    const result: QueryResult = await this.pool.query(sql, params);
    return result.rows.map(rowToItem);
  }

  async updateStock(
    facilityId: string,
    id: string,
    dto: UpdateStockDto,
  ): Promise<InventoryItem> {
    const sql = `
      UPDATE inventory_items
         SET current_stock = $1,
             last_restocked_at = NOW()
       WHERE id = $2 AND facility_id = $3
      RETURNING *
    `;
    const result: QueryResult = await this.pool.query(sql, [
      dto.currentStock,
      id,
      facilityId,
    ]);

    if (result.rowCount === 0) {
      throw new NotFoundException(`Inventory item ${id} not found`);
    }

    this.logger.log(`Inventory ${id} stock updated to ${dto.currentStock}`);
    return rowToItem(result.rows[0]);
  }

  async getLowStock(facilityId: string): Promise<InventoryItem[]> {
    const sql = `
      SELECT * FROM inventory_items
       WHERE facility_id = $1
         AND current_stock < min_required
       ORDER BY (min_required - current_stock) DESC
    `;
    const result: QueryResult = await this.pool.query(sql, [facilityId]);
    return result.rows.map(rowToItem);
  }
}

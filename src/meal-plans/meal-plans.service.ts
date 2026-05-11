/**
 * US-13-07 – MealPlansService
 */

import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { PG_POOL } from '../database/database.module';
import { MealPlan } from './meal-plans.schema';
import { CreateMealPlanDto } from './dto/create-meal-plan.dto';
import { UpdateMealPlanDto } from './dto/update-meal-plan.dto';

function rowToMealPlan(row: Record<string, unknown>): MealPlan {
  return {
    id: row.id as string,
    facilityId: row.facility_id as string,
    residentId: row.resident_id as string,
    planDate:
      (row.plan_date as Date)?.toISOString?.().slice(0, 10) ??
      (row.plan_date as string),
    breakfast: (row.breakfast as string) ?? undefined,
    lunch: (row.lunch as string) ?? undefined,
    dinner: (row.dinner as string) ?? undefined,
    specialInstructions: (row.special_instructions as string) ?? undefined,
    createdBy: row.created_by as string,
    createdAt:
      (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
    updatedAt:
      (row.updated_at as Date)?.toISOString?.() ?? (row.updated_at as string),
  };
}

@Injectable()
export class MealPlansService {
  private readonly logger = new Logger(MealPlansService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(
    facilityId: string,
    userId: string,
    dto: CreateMealPlanDto,
  ): Promise<MealPlan> {
    const sql = `
      INSERT INTO meal_plans
        (facility_id, resident_id, plan_date, breakfast, lunch,
         dinner, special_instructions, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `;
    const params = [
      facilityId,
      dto.residentId,
      dto.planDate,
      dto.breakfast ?? null,
      dto.lunch ?? null,
      dto.dinner ?? null,
      dto.specialInstructions ?? null,
      userId,
    ];

    const result: QueryResult = await this.pool.query(sql, params);
    this.logger.log(`Meal plan created: ${result.rows[0].id}`);
    return rowToMealPlan(result.rows[0]);
  }

  async findAll(
    facilityId: string,
    filters?: { residentId?: string; date?: string },
  ): Promise<MealPlan[]> {
    let sql = `SELECT * FROM meal_plans WHERE facility_id = $1`;
    const params: unknown[] = [facilityId];
    let idx = 2;

    if (filters?.residentId) {
      sql += ` AND resident_id = $${idx}`;
      params.push(filters.residentId);
      idx++;
    }
    if (filters?.date) {
      sql += ` AND plan_date = $${idx}`;
      params.push(filters.date);
      idx++;
    }

    sql += ` ORDER BY plan_date DESC`;

    const result: QueryResult = await this.pool.query(sql, params);
    return result.rows.map(rowToMealPlan);
  }

  async update(
    facilityId: string,
    id: string,
    dto: UpdateMealPlanDto,
  ): Promise<MealPlan> {
    const fieldMap: Record<string, unknown> = {
      plan_date: dto.planDate,
      breakfast: dto.breakfast,
      lunch: dto.lunch,
      dinner: dto.dinner,
      special_instructions: dto.specialInstructions,
    };

    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    for (const [col, value] of Object.entries(fieldMap)) {
      if (value !== undefined) {
        setClauses.push(`${col} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      const sql = `SELECT * FROM meal_plans WHERE id = $1 AND facility_id = $2`;
      const result: QueryResult = await this.pool.query(sql, [id, facilityId]);
      if (result.rowCount === 0)
        throw new NotFoundException(`Meal plan ${id} not found`);
      return rowToMealPlan(result.rows[0]);
    }

    params.push(id);
    params.push(facilityId);

    const sql = `
      UPDATE meal_plans
         SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
         AND facility_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result: QueryResult = await this.pool.query(sql, params);
    if (result.rowCount === 0)
      throw new NotFoundException(`Meal plan ${id} not found`);

    this.logger.log(`Meal plan ${id} updated`);
    return rowToMealPlan(result.rows[0]);
  }
}

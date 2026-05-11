/**
 * US-13-01 – DoctorVisitsService
 */

import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { PG_POOL } from '../database/database.module';
import { DoctorVisit } from './doctor-visits.schema';
import { CreateDoctorVisitDto } from './dto/create-doctor-visit.dto';
import { UpdateDoctorVisitDto } from './dto/update-doctor-visit.dto';

function rowToVisit(row: Record<string, unknown>): DoctorVisit {
  return {
    id: row.id as string,
    facilityId: row.facility_id as string,
    residentId: row.resident_id as string,
    doctorName: row.doctor_name as string,
    specialty: (row.specialty as string) ?? undefined,
    visitDate:
      (row.visit_date as Date)?.toISOString?.().slice(0, 10) ??
      (row.visit_date as string),
    purpose: (row.purpose as string) ?? undefined,
    results: (row.results as string) ?? undefined,
    createdBy: row.created_by as string,
    createdAt:
      (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
    updatedAt:
      (row.updated_at as Date)?.toISOString?.() ?? (row.updated_at as string),
  };
}

@Injectable()
export class DoctorVisitsService {
  private readonly logger = new Logger(DoctorVisitsService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(
    facilityId: string,
    userId: string,
    dto: CreateDoctorVisitDto,
  ): Promise<DoctorVisit> {
    const sql = `
      INSERT INTO doctor_visits
        (facility_id, resident_id, doctor_name, specialty,
         visit_date, purpose, results, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `;
    const params = [
      facilityId,
      dto.residentId,
      dto.doctorName,
      dto.specialty ?? null,
      dto.visitDate,
      dto.purpose ?? null,
      dto.results ?? null,
      userId,
    ];

    const result: QueryResult = await this.pool.query(sql, params);
    this.logger.log(`Doctor visit created: ${result.rows[0].id}`);
    return rowToVisit(result.rows[0]);
  }

  async findAll(
    facilityId: string,
    filters?: { residentId?: string; upcoming?: boolean },
  ): Promise<DoctorVisit[]> {
    let sql = `SELECT * FROM doctor_visits WHERE facility_id = $1`;
    const params: unknown[] = [facilityId];
    let idx = 2;

    if (filters?.residentId) {
      sql += ` AND resident_id = $${idx}`;
      params.push(filters.residentId);
      idx++;
    }
    if (filters?.upcoming) {
      sql += ` AND visit_date >= CURRENT_DATE`;
    }

    sql += ` ORDER BY visit_date ASC`;

    const result: QueryResult = await this.pool.query(sql, params);
    return result.rows.map(rowToVisit);
  }

  async update(
    facilityId: string,
    id: string,
    dto: UpdateDoctorVisitDto,
  ): Promise<DoctorVisit> {
    const fieldMap: Record<string, unknown> = {
      doctor_name: dto.doctorName,
      specialty: dto.specialty,
      visit_date: dto.visitDate,
      purpose: dto.purpose,
      results: dto.results,
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
      const existing = await this.findOne(facilityId, id);
      return existing;
    }

    params.push(id);
    params.push(facilityId);

    const sql = `
      UPDATE doctor_visits
         SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
         AND facility_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result: QueryResult = await this.pool.query(sql, params);
    if (result.rowCount === 0) {
      throw new NotFoundException(`Doctor visit ${id} not found`);
    }

    this.logger.log(`Doctor visit ${id} updated`);
    return rowToVisit(result.rows[0]);
  }

  private async findOne(facilityId: string, id: string): Promise<DoctorVisit> {
    const sql = `SELECT * FROM doctor_visits WHERE id = $1 AND facility_id = $2`;
    const result: QueryResult = await this.pool.query(sql, [id, facilityId]);
    if (result.rowCount === 0) {
      throw new NotFoundException(`Doctor visit ${id} not found`);
    }
    return rowToVisit(result.rows[0]);
  }
}

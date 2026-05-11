/**
 * US-13-05 – PrescriptionsService
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { PG_POOL } from '../database/database.module';
import { Prescription } from './prescriptions.schema';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';

function rowToPrescription(row: Record<string, unknown>): Prescription {
  return {
    id: row.id as string,
    facilityId: row.facility_id as string,
    residentId: row.resident_id as string,
    title: row.title as string,
    doctorName: (row.doctor_name as string) ?? undefined,
    prescriptionDate:
      (row.prescription_date as Date)?.toISOString?.().slice(0, 10) ??
      (row.prescription_date as string),
    fileUrl: (row.file_url as string) ?? undefined,
    createdAt:
      (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
  };
}

@Injectable()
export class PrescriptionsService {
  private readonly logger = new Logger(PrescriptionsService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(
    facilityId: string,
    dto: CreatePrescriptionDto,
  ): Promise<Prescription> {
    const sql = `
      INSERT INTO medical_prescriptions
        (facility_id, resident_id, title, doctor_name, prescription_date, file_url)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
    `;
    const params = [
      facilityId,
      dto.residentId,
      dto.title,
      dto.doctorName ?? null,
      dto.prescriptionDate ?? new Date().toISOString().slice(0, 10),
      dto.fileUrl ?? null,
    ];

    const result: QueryResult = await this.pool.query(sql, params);
    this.logger.log(`Prescription created: ${result.rows[0].id}`);
    return rowToPrescription(result.rows[0]);
  }

  async findAll(
    facilityId: string,
    filters?: { residentId?: string },
  ): Promise<Prescription[]> {
    let sql = `SELECT * FROM medical_prescriptions WHERE facility_id = $1`;
    const params: unknown[] = [facilityId];

    if (filters?.residentId) {
      sql += ` AND resident_id = $2`;
      params.push(filters.residentId);
    }

    sql += ` ORDER BY prescription_date DESC, created_at DESC`;

    const result: QueryResult = await this.pool.query(sql, params);
    return result.rows.map(rowToPrescription);
  }
}

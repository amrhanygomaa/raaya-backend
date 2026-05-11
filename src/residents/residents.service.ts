/**
 * US-03-02 – ResidentsService
 *
 * Provides CRUD operations against the PostgreSQL `residents` table.
 * Every query is scoped to the caller's facilityId to prevent cross-facility
 * access – the facilityId is always injected from the JWT, never from the
 * request body or URL.
 */

import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { PG_POOL } from '../database/database.module';
import { Resident } from './residents.schema';
import { CreateResidentDto } from './dto/create-resident.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';
import { UpsertMedicalInfoDto } from './dto/upsert-medical-info.dto';

export interface ResidentMedicalInfo {
  id: string;
  residentId: string;
  facilityId: string;
  diagnoses: string[];
  allergies: string[];
  bloodType?: string;
  chronicConditions: string[];
  createdAt: string;
  updatedAt: string;
}

function rowToMedicalInfo(row: Record<string, unknown>): ResidentMedicalInfo {
  return {
    id: row.id as string,
    residentId: row.resident_id as string,
    facilityId: row.facility_id as string,
    diagnoses: (row.diagnoses as string[]) ?? [],
    allergies: (row.allergies as string[]) ?? [],
    bloodType: (row.blood_type as string) ?? undefined,
    chronicConditions: (row.chronic_conditions as string[]) ?? [],
    createdAt:
      (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
    updatedAt:
      (row.updated_at as Date)?.toISOString?.() ?? (row.updated_at as string),
  };
}

/** Maps a snake_case DB row to the camelCase Resident interface. */
function rowToResident(row: Record<string, unknown>): Resident {
  return {
    id: row.id as string,
    facilityId: row.facility_id as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    dateOfBirth:
      (row.date_of_birth as Date)?.toISOString?.().slice(0, 10) ??
      (row.date_of_birth as string),
    gender: row.gender as Resident['gender'],
    nationalId: (row.national_id as string) ?? undefined,
    roomNumber: (row.room_number as string) ?? undefined,
    admissionDate:
      (row.admission_date as Date)?.toISOString?.().slice(0, 10) ??
      (row.admission_date as string),
    dischargeDate: row.discharge_date
      ? ((row.discharge_date as Date)?.toISOString?.().slice(0, 10) ??
        (row.discharge_date as string))
      : undefined,
    status: row.status as Resident['status'],
    notes: (row.notes as string) ?? undefined,
    createdAt:
      (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
    updatedAt:
      (row.updated_at as Date)?.toISOString?.() ?? (row.updated_at as string),
  };
}

@Injectable()
export class ResidentsService {
  private readonly logger = new Logger(ResidentsService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  // ── CREATE ─────────────────────────────────────────────────────────────────

  async create(facilityId: string, dto: CreateResidentDto): Promise<Resident> {
    const sql = `
      INSERT INTO residents
        (facility_id, first_name, last_name, date_of_birth, gender,
         national_id, room_number, admission_date, discharge_date, status, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
    `;
    const params = [
      facilityId,
      dto.firstName,
      dto.lastName,
      dto.dateOfBirth,
      dto.gender,
      dto.nationalId ?? null,
      dto.roomNumber ?? null,
      dto.admissionDate,
      dto.dischargeDate ?? null,
      dto.status ?? 'active',
      dto.notes ?? null,
    ];

    const result: QueryResult = await this.pool.query(sql, params);
    this.logger.log(
      `Created resident ${result.rows[0].id} in facility ${facilityId}`,
    );
    return rowToResident(result.rows[0]);
  }

  // ── READ (list) ────────────────────────────────────────────────────────────

  async findAll(
    facilityId: string,
    filters?: { status?: string },
  ): Promise<Resident[]> {
    let sql = `SELECT * FROM residents WHERE facility_id = $1`;
    const params: unknown[] = [facilityId];

    if (filters?.status) {
      sql += ` AND status = $2`;
      params.push(filters.status);
    }

    sql += ` ORDER BY last_name, first_name`;

    const result: QueryResult = await this.pool.query(sql, params);
    return result.rows.map(rowToResident);
  }

  // ── READ (single) ─────────────────────────────────────────────────────────

  async findOne(facilityId: string, residentId: string): Promise<Resident> {
    const sql = `SELECT * FROM residents WHERE id = $1 AND facility_id = $2`;
    const result: QueryResult = await this.pool.query(sql, [
      residentId,
      facilityId,
    ]);

    if (result.rowCount === 0) {
      throw new NotFoundException(`Resident ${residentId} not found`);
    }

    return rowToResident(result.rows[0]);
  }

  // ── UPDATE (PATCH) ─────────────────────────────────────────────────────────

  async update(
    facilityId: string,
    residentId: string,
    dto: UpdateResidentDto,
  ): Promise<Resident> {
    // Build a dynamic SET clause from only the provided fields.
    const fieldMap: Record<string, unknown> = {
      first_name: dto.firstName,
      last_name: dto.lastName,
      date_of_birth: dto.dateOfBirth,
      gender: dto.gender,
      national_id: dto.nationalId,
      room_number: dto.roomNumber,
      admission_date: dto.admissionDate,
      discharge_date: dto.dischargeDate,
      status: dto.status,
      notes: dto.notes,
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
      // Nothing to update – just return the current row.
      return this.findOne(facilityId, residentId);
    }

    params.push(residentId); // $N
    params.push(facilityId); // $N+1

    const sql = `
      UPDATE residents
         SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
         AND facility_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result: QueryResult = await this.pool.query(sql, params);

    if (result.rowCount === 0) {
      throw new NotFoundException(`Resident ${residentId} not found`);
    }

    this.logger.log(`Updated resident ${residentId} in facility ${facilityId}`);
    return rowToResident(result.rows[0]);
  }

  // ── GET MEDICAL INFO ────────────────────────────────────────────────────────

  async getMedicalInfo(
    facilityId: string,
    residentId: string,
  ): Promise<ResidentMedicalInfo> {
    // Verify resident exists in this facility
    await this.findOne(facilityId, residentId);

    const sql = `
      SELECT * FROM resident_medical_info
       WHERE resident_id = $1 AND facility_id = $2
    `;
    const result: QueryResult = await this.pool.query(sql, [
      residentId,
      facilityId,
    ]);

    if (result.rowCount === 0) {
      // Return empty medical info if none exists
      return {
        id: '',
        residentId,
        facilityId,
        diagnoses: [],
        allergies: [],
        chronicConditions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    return rowToMedicalInfo(result.rows[0]);
  }

  // ── UPSERT MEDICAL INFO ────────────────────────────────────────────────────

  async upsertMedicalInfo(
    facilityId: string,
    residentId: string,
    dto: UpsertMedicalInfoDto,
  ): Promise<ResidentMedicalInfo> {
    // Verify resident exists in this facility
    await this.findOne(facilityId, residentId);

    const sql = `
      INSERT INTO resident_medical_info
        (resident_id, facility_id, diagnoses, allergies, blood_type, chronic_conditions)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (resident_id) DO UPDATE SET
        diagnoses = COALESCE($3, resident_medical_info.diagnoses),
        allergies = COALESCE($4, resident_medical_info.allergies),
        blood_type = COALESCE($5, resident_medical_info.blood_type),
        chronic_conditions = COALESCE($6, resident_medical_info.chronic_conditions)
      RETURNING *
    `;

    const params = [
      residentId,
      facilityId,
      JSON.stringify(dto.diagnoses ?? []),
      JSON.stringify(dto.allergies ?? []),
      dto.bloodType ?? null,
      JSON.stringify(dto.chronicConditions ?? []),
    ];

    const result: QueryResult = await this.pool.query(sql, params);
    this.logger.log(`Medical info upserted for resident ${residentId}`);
    return rowToMedicalInfo(result.rows[0]);
  }
}

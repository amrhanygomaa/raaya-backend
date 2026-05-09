/**
 * US-04-01 – MedicationsService
 *
 * Provides CRUD for medication_schedules, dose logging, and overdue queries.
 * Every query is facility-scoped via the caller's JWT facilityId.
 */

import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { PG_POOL } from '../database/database.module';
import {
  MedicationSchedule,
  DoseLog,
  OverdueDose,
  AdherencePeriod,
  AdherenceReport,
  ResidentAdherence,
} from './medications.schema';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { LogDoseDto } from './dto/log-dose.dto';
import { UpdateDoseDto } from './dto/update-dose.dto';

// ── Row mappers ──────────────────────────────────────────────────────────

function rowToSchedule(row: Record<string, unknown>): MedicationSchedule {
  return {
    id: row.id as string,
    residentId: row.resident_id as string,
    facilityId: row.facility_id as string,
    medicationName: row.medication_name as string,
    dosage: row.dosage as string,
    route: row.route as MedicationSchedule['route'],
    frequency: row.frequency as MedicationSchedule['frequency'],
    scheduledTimes: (row.scheduled_times as string[]) ?? [],
    startDate:
      (row.start_date as Date)?.toISOString?.().slice(0, 10) ??
      (row.start_date as string),
    endDate: row.end_date
      ? ((row.end_date as Date)?.toISOString?.().slice(0, 10) ??
        (row.end_date as string))
      : undefined,
    isActive: row.is_active as boolean,
    prescriber: (row.prescriber as string) ?? undefined,
    notes: (row.notes as string) ?? undefined,
    createdAt:
      (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
    updatedAt:
      (row.updated_at as Date)?.toISOString?.() ?? (row.updated_at as string),
  };
}

function rowToDoseLog(row: Record<string, unknown>): DoseLog {
  return {
    id: row.id as string,
    scheduleId: row.schedule_id as string,
    residentId: row.resident_id as string,
    facilityId: row.facility_id as string,
    scheduledTime:
      (row.scheduled_time as Date)?.toISOString?.() ??
      (row.scheduled_time as string),
    status: row.status as DoseLog['status'],
    administeredAt: row.administered_at
      ? ((row.administered_at as Date)?.toISOString?.() ??
        (row.administered_at as string))
      : undefined,
    administeredBy: (row.administered_by as string) ?? undefined,
    notes: (row.notes as string) ?? undefined,
    createdAt:
      (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
    updatedAt:
      (row.updated_at as Date)?.toISOString?.() ?? (row.updated_at as string),
  };
}

function rowToOverdueDose(row: Record<string, unknown>): OverdueDose {
  return {
    ...rowToDoseLog(row),
    medicationName: row.medication_name as string,
    dosage: row.dosage as string,
    residentFirstName: row.first_name as string,
    residentLastName: row.last_name as string,
    roomNumber: (row.room_number as string) ?? undefined,
  };
}

@Injectable()
export class MedicationsService {
  private readonly logger = new Logger(MedicationsService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  SCHEDULE CRUD
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async createSchedule(
    facilityId: string,
    dto: CreateScheduleDto,
  ): Promise<MedicationSchedule> {
    const sql = `
      INSERT INTO medication_schedules
        (resident_id, facility_id, medication_name, dosage, route,
         frequency, scheduled_times, start_date, end_date, is_active,
         prescriber, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
    `;
    const params = [
      dto.residentId,
      facilityId,
      dto.medicationName,
      dto.dosage,
      dto.route ?? 'oral',
      dto.frequency ?? 'daily',
      dto.scheduledTimes ?? [],
      dto.startDate ?? new Date().toISOString().slice(0, 10),
      dto.endDate ?? null,
      dto.isActive ?? true,
      dto.prescriber ?? null,
      dto.notes ?? null,
    ];

    const result: QueryResult = await this.pool.query(sql, params);
    this.logger.log(
      `Created schedule ${result.rows[0].id} for resident ${dto.residentId}`,
    );
    return rowToSchedule(result.rows[0]);
  }

  async findAllSchedules(
    facilityId: string,
    filters?: { residentId?: string; active?: boolean },
  ): Promise<MedicationSchedule[]> {
    let sql = `SELECT * FROM medication_schedules WHERE facility_id = $1`;
    const params: unknown[] = [facilityId];
    let idx = 2;

    if (filters?.residentId) {
      sql += ` AND resident_id = $${idx}`;
      params.push(filters.residentId);
      idx++;
    }
    if (filters?.active !== undefined) {
      sql += ` AND is_active = $${idx}`;
      params.push(filters.active);
      idx++;
    }

    sql += ` ORDER BY medication_name`;

    const result: QueryResult = await this.pool.query(sql, params);
    return result.rows.map(rowToSchedule);
  }

  async findOneSchedule(
    facilityId: string,
    scheduleId: string,
  ): Promise<MedicationSchedule> {
    const sql = `SELECT * FROM medication_schedules WHERE id = $1 AND facility_id = $2`;
    const result: QueryResult = await this.pool.query(sql, [
      scheduleId,
      facilityId,
    ]);

    if (result.rowCount === 0) {
      throw new NotFoundException(`Schedule ${scheduleId} not found`);
    }

    return rowToSchedule(result.rows[0]);
  }

  async updateSchedule(
    facilityId: string,
    scheduleId: string,
    dto: UpdateScheduleDto,
  ): Promise<MedicationSchedule> {
    const fieldMap: Record<string, unknown> = {
      medication_name: dto.medicationName,
      dosage: dto.dosage,
      route: dto.route,
      frequency: dto.frequency,
      scheduled_times: dto.scheduledTimes,
      start_date: dto.startDate,
      end_date: dto.endDate,
      is_active: dto.isActive,
      prescriber: dto.prescriber,
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
      return this.findOneSchedule(facilityId, scheduleId);
    }

    params.push(scheduleId);
    params.push(facilityId);

    const sql = `
      UPDATE medication_schedules
         SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
         AND facility_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result: QueryResult = await this.pool.query(sql, params);

    if (result.rowCount === 0) {
      throw new NotFoundException(`Schedule ${scheduleId} not found`);
    }

    this.logger.log(`Updated schedule ${scheduleId}`);
    return rowToSchedule(result.rows[0]);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  DOSE LOGGING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async logDose(
    facilityId: string,
    userId: string,
    dto: LogDoseDto,
  ): Promise<DoseLog> {
    const sql = `
      INSERT INTO dose_logs
        (schedule_id, resident_id, facility_id,
         scheduled_time, status, administered_at, administered_by, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `;
    const params = [
      dto.scheduleId,
      dto.residentId,
      facilityId,
      dto.scheduledTime,
      dto.status,
      dto.administeredAt ?? null,
      dto.status === 'given' ? userId : null,
      dto.notes ?? null,
    ];

    const result: QueryResult = await this.pool.query(sql, params);
    this.logger.log(
      `Logged dose ${result.rows[0].id} [${dto.status}] for schedule ${dto.scheduleId}`,
    );
    return rowToDoseLog(result.rows[0]);
  }

  async updateDose(
    facilityId: string,
    doseId: string,
    userId: string,
    dto: UpdateDoseDto,
  ): Promise<DoseLog> {
    const sql = `
      UPDATE dose_logs
         SET status = $1,
             administered_at = $2,
             administered_by = $3,
             notes = COALESCE($4, notes)
       WHERE id = $5
         AND facility_id = $6
      RETURNING *
    `;
    const params = [
      dto.status,
      dto.administeredAt ??
        (dto.status === 'given' ? new Date().toISOString() : null),
      dto.status === 'given' ? userId : null,
      dto.notes ?? null,
      doseId,
      facilityId,
    ];

    const result: QueryResult = await this.pool.query(sql, params);

    if (result.rowCount === 0) {
      throw new NotFoundException(`Dose log ${doseId} not found`);
    }

    this.logger.log(`Updated dose ${doseId} → ${dto.status}`);
    return rowToDoseLog(result.rows[0]);
  }

  async findDoseLogs(
    facilityId: string,
    filters?: { residentId?: string; scheduleId?: string; status?: string },
  ): Promise<DoseLog[]> {
    let sql = `SELECT * FROM dose_logs WHERE facility_id = $1`;
    const params: unknown[] = [facilityId];
    let idx = 2;

    if (filters?.residentId) {
      sql += ` AND resident_id = $${idx}`;
      params.push(filters.residentId);
      idx++;
    }
    if (filters?.scheduleId) {
      sql += ` AND schedule_id = $${idx}`;
      params.push(filters.scheduleId);
      idx++;
    }
    if (filters?.status) {
      sql += ` AND status = $${idx}`;
      params.push(filters.status);
      idx++;
    }

    sql += ` ORDER BY scheduled_time DESC`;

    const result: QueryResult = await this.pool.query(sql, params);
    return result.rows.map(rowToDoseLog);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  OVERDUE QUERY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Returns dose_logs that are still 'pending' AND whose scheduled_time
   * is in the past – i.e. overdue doses that haven't been given yet.
   * Joins medication_schedules and residents for context.
   */
  async findOverdue(facilityId: string): Promise<OverdueDose[]> {
    const sql = `
      SELECT
        dl.*,
        ms.medication_name,
        ms.dosage,
        r.first_name,
        r.last_name,
        r.room_number
      FROM dose_logs dl
      JOIN medication_schedules ms ON ms.id = dl.schedule_id
      JOIN residents r ON r.id = dl.resident_id
      WHERE dl.facility_id = $1
        AND dl.status = 'pending'
        AND dl.scheduled_time < NOW()
      ORDER BY dl.scheduled_time ASC
    `;

    const result: QueryResult = await this.pool.query(sql, [facilityId]);
    return result.rows.map(rowToOverdueDose);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  ADHERENCE REPORTING  (US-04-05)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Returns weekly or monthly adherence percentages broken down by resident
   * and aggregated at the facility level.
   *
   * Adherence % = (given doses / total doses) × 100
   * Period: 'weekly' → last 7 days, 'monthly' → last 30 days.
   */
  async getAdherenceReport(
    facilityId: string,
    period: AdherencePeriod = 'weekly',
    residentId?: string,
  ): Promise<AdherenceReport> {
    const days = period === 'weekly' ? 7 : 30;

    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);

    let residentFilter = '';
    const params: unknown[] = [
      facilityId,
      from.toISOString(),
      to.toISOString(),
    ];

    if (residentId) {
      residentFilter = `AND dl.resident_id = $4`;
      params.push(residentId);
    }

    const sql = `
      SELECT
        dl.resident_id,
        r.first_name,
        r.last_name,
        r.room_number,
        COUNT(*)::int                                     AS total_doses,
        COUNT(*) FILTER (WHERE dl.status = 'given')::int  AS given_doses
      FROM dose_logs dl
      JOIN residents r ON r.id = dl.resident_id
      WHERE dl.facility_id = $1
        AND dl.scheduled_time >= $2
        AND dl.scheduled_time <= $3
        ${residentFilter}
      GROUP BY dl.resident_id, r.first_name, r.last_name, r.room_number
      ORDER BY r.last_name, r.first_name
    `;

    const result: QueryResult = await this.pool.query(sql, params);

    const residents: ResidentAdherence[] = result.rows.map((row) => {
      const total = row.total_doses as number;
      const given = row.given_doses as number;
      return {
        residentId: row.resident_id as string,
        residentFirstName: row.first_name as string,
        residentLastName: row.last_name as string,
        roomNumber: (row.room_number as string) ?? undefined,
        totalDoses: total,
        givenDoses: given,
        percentage: total > 0 ? Math.round((given / total) * 10000) / 100 : 0,
      };
    });

    const totalDoses = residents.reduce((s, r) => s + r.totalDoses, 0);
    const givenDoses = residents.reduce((s, r) => s + r.givenDoses, 0);

    return {
      period,
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      facilityId,
      facilityAdherence: {
        totalDoses,
        givenDoses,
        percentage:
          totalDoses > 0
            ? Math.round((givenDoses / totalDoses) * 10000) / 100
            : 0,
      },
      residents,
    };
  }
}

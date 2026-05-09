/**
 * US-06-01 – HealthService
 *
 * Provides:
 *  - Record vital signs with automatic threshold checking
 *  - Auto-create vital_alerts for out-of-range values
 *  - List vitals / alerts
 *  - CRUD for vital thresholds (Admin editable)
 *  - Acknowledge / resolve alerts
 *
 * Every query is facility-scoped via the caller's JWT facilityId.
 */

import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { PG_POOL } from '../database/database.module';
import {
  VitalSign,
  VitalAlert,
  VitalThreshold,
  RecordVitalsResult,
} from './health.schema';
import { RecordVitalsDto } from './dto/record-vitals.dto';
import { UpdateThresholdDto } from './dto/update-threshold.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';

// ── Row mappers ──────────────────────────────────────────────────────────

function toNum(v: unknown): number | undefined {
  return v != null ? Number(v) : undefined;
}

function rowToVitalSign(row: Record<string, unknown>): VitalSign {
  return {
    id: row.id as string,
    residentId: row.resident_id as string,
    facilityId: row.facility_id as string,
    recordedBy: row.recorded_by as string,
    recordedAt:
      (row.recorded_at as Date)?.toISOString?.() ?? (row.recorded_at as string),
    heartRate: toNum(row.heart_rate),
    bloodPressureSystolic: toNum(row.blood_pressure_systolic),
    bloodPressureDiastolic: toNum(row.blood_pressure_diastolic),
    temperature: toNum(row.temperature),
    respiratoryRate: toNum(row.respiratory_rate),
    oxygenSaturation: toNum(row.oxygen_saturation),
    bloodGlucose: toNum(row.blood_glucose),
    weight: toNum(row.weight),
    notes: (row.notes as string) ?? undefined,
    createdAt:
      (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
    updatedAt:
      (row.updated_at as Date)?.toISOString?.() ?? (row.updated_at as string),
  };
}

function rowToAlert(row: Record<string, unknown>): VitalAlert {
  return {
    id: row.id as string,
    vitalSignId: row.vital_sign_id as string,
    residentId: row.resident_id as string,
    facilityId: row.facility_id as string,
    vitalType: row.vital_type as string,
    recordedValue: Number(row.recorded_value),
    thresholdMin: toNum(row.threshold_min),
    thresholdMax: toNum(row.threshold_max),
    severity: row.severity as VitalAlert['severity'],
    status: row.status as VitalAlert['status'],
    acknowledgedBy: (row.acknowledged_by as string) ?? undefined,
    notes: (row.notes as string) ?? undefined,
    createdAt:
      (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
    updatedAt:
      (row.updated_at as Date)?.toISOString?.() ?? (row.updated_at as string),
  };
}

function rowToThreshold(row: Record<string, unknown>): VitalThreshold {
  return {
    id: row.id as string,
    facilityId: row.facility_id as string,
    vitalType: row.vital_type as string,
    minValue: toNum(row.min_value),
    maxValue: toNum(row.max_value),
    unit: row.unit as string,
    createdAt:
      (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
    updatedAt:
      (row.updated_at as Date)?.toISOString?.() ?? (row.updated_at as string),
  };
}

// ── Mapping: DTO field → DB column / vital_type ─────────────────────────

const VITAL_FIELD_MAP: {
  field: keyof RecordVitalsDto;
  column: string;
  vitalType: string;
}[] = [
  { field: 'heartRate', column: 'heart_rate', vitalType: 'heart_rate' },
  {
    field: 'bloodPressureSystolic',
    column: 'blood_pressure_systolic',
    vitalType: 'blood_pressure_systolic',
  },
  {
    field: 'bloodPressureDiastolic',
    column: 'blood_pressure_diastolic',
    vitalType: 'blood_pressure_diastolic',
  },
  { field: 'temperature', column: 'temperature', vitalType: 'temperature' },
  {
    field: 'respiratoryRate',
    column: 'respiratory_rate',
    vitalType: 'respiratory_rate',
  },
  {
    field: 'oxygenSaturation',
    column: 'oxygen_saturation',
    vitalType: 'oxygen_saturation',
  },
  {
    field: 'bloodGlucose',
    column: 'blood_glucose',
    vitalType: 'blood_glucose',
  },
];

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  RECORD VITALS + AUTO-ALERT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async recordVitals(
    facilityId: string,
    userId: string,
    dto: RecordVitalsDto,
  ): Promise<RecordVitalsResult> {
    // 1. Insert vital sign
    const sql = `
      INSERT INTO vital_signs
        (resident_id, facility_id, recorded_by,
         heart_rate, blood_pressure_systolic, blood_pressure_diastolic,
         temperature, respiratory_rate, oxygen_saturation,
         blood_glucose, weight, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
    `;
    const params = [
      dto.residentId,
      facilityId,
      userId,
      dto.heartRate ?? null,
      dto.bloodPressureSystolic ?? null,
      dto.bloodPressureDiastolic ?? null,
      dto.temperature ?? null,
      dto.respiratoryRate ?? null,
      dto.oxygenSaturation ?? null,
      dto.bloodGlucose ?? null,
      dto.weight ?? null,
      dto.notes ?? null,
    ];

    const result: QueryResult = await this.pool.query(sql, params);
    const vitalSign = rowToVitalSign(result.rows[0]);

    this.logger.log(
      `Recorded vitals ${vitalSign.id} for resident ${dto.residentId}`,
    );

    // 2. Check thresholds & create alerts
    const alerts = await this.checkThresholds(
      facilityId,
      vitalSign.id,
      dto.residentId,
      dto,
    );

    return { vitalSign, alerts };
  }

  private async checkThresholds(
    facilityId: string,
    vitalSignId: string,
    residentId: string,
    dto: RecordVitalsDto,
  ): Promise<VitalAlert[]> {
    // Fetch all thresholds for this facility
    const threshRes: QueryResult = await this.pool.query(
      `SELECT * FROM vital_thresholds WHERE facility_id = $1`,
      [facilityId],
    );
    const thresholds = new Map<string, { min?: number; max?: number }>();
    for (const row of threshRes.rows) {
      thresholds.set(row.vital_type as string, {
        min: row.min_value != null ? Number(row.min_value) : undefined,
        max: row.max_value != null ? Number(row.max_value) : undefined,
      });
    }

    const alerts: VitalAlert[] = [];

    for (const { field, vitalType } of VITAL_FIELD_MAP) {
      const value = dto[field] as number | undefined;
      if (value == null) continue;

      const thresh = thresholds.get(vitalType);
      if (!thresh) continue;

      const belowMin = thresh.min != null && value < thresh.min;
      const aboveMax = thresh.max != null && value > thresh.max;

      if (!belowMin && !aboveMax) continue;

      // Create alert
      const alertSql = `
        INSERT INTO vital_alerts
          (vital_sign_id, resident_id, facility_id,
           vital_type, recorded_value, threshold_min, threshold_max,
           severity, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,'warning','active')
        RETURNING *
      `;
      const alertResult: QueryResult = await this.pool.query(alertSql, [
        vitalSignId,
        residentId,
        facilityId,
        vitalType,
        value,
        thresh.min ?? null,
        thresh.max ?? null,
      ]);

      const alert = rowToAlert(alertResult.rows[0]);
      alerts.push(alert);

      this.logger.warn(
        `ALERT: ${vitalType}=${value} out of range [${thresh.min ?? '-∞'},${thresh.max ?? '∞'}] for resident ${residentId}`,
      );
    }

    return alerts;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  LIST VITALS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async findVitals(
    facilityId: string,
    filters?: { residentId?: string },
  ): Promise<VitalSign[]> {
    let sql = `SELECT * FROM vital_signs WHERE facility_id = $1`;
    const params: unknown[] = [facilityId];
    let idx = 2;

    if (filters?.residentId) {
      sql += ` AND resident_id = $${idx}`;
      params.push(filters.residentId);
      idx++;
    }

    sql += ` ORDER BY recorded_at DESC`;

    const result: QueryResult = await this.pool.query(sql, params);
    return result.rows.map(rowToVitalSign);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  ALERTS – LIST & UPDATE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async findAlerts(
    facilityId: string,
    filters?: { residentId?: string; status?: string },
  ): Promise<VitalAlert[]> {
    let sql = `SELECT * FROM vital_alerts WHERE facility_id = $1`;
    const params: unknown[] = [facilityId];
    let idx = 2;

    if (filters?.residentId) {
      sql += ` AND resident_id = $${idx}`;
      params.push(filters.residentId);
      idx++;
    }
    if (filters?.status) {
      sql += ` AND status = $${idx}`;
      params.push(filters.status);
      idx++;
    }

    sql += ` ORDER BY created_at DESC`;

    const result: QueryResult = await this.pool.query(sql, params);
    return result.rows.map(rowToAlert);
  }

  async updateAlert(
    facilityId: string,
    alertId: string,
    userId: string,
    dto: UpdateAlertDto,
  ): Promise<VitalAlert> {
    const sql = `
      UPDATE vital_alerts
         SET status = $1,
             acknowledged_by = $2,
             notes = COALESCE($3, notes)
       WHERE id = $4
         AND facility_id = $5
      RETURNING *
    `;
    const result: QueryResult = await this.pool.query(sql, [
      dto.status,
      dto.status === 'acknowledged' ? userId : null,
      dto.notes ?? null,
      alertId,
      facilityId,
    ]);

    if (result.rowCount === 0) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }

    this.logger.log(`Alert ${alertId} → ${dto.status}`);
    return rowToAlert(result.rows[0]);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  THRESHOLDS – LIST & UPSERT (Admin)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async findThresholds(facilityId: string): Promise<VitalThreshold[]> {
    const sql = `SELECT * FROM vital_thresholds WHERE facility_id = $1 ORDER BY vital_type`;
    const result: QueryResult = await this.pool.query(sql, [facilityId]);
    return result.rows.map(rowToThreshold);
  }

  async upsertThreshold(
    facilityId: string,
    dto: UpdateThresholdDto,
  ): Promise<VitalThreshold> {
    const sql = `
      INSERT INTO vital_thresholds (facility_id, vital_type, min_value, max_value, unit)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (facility_id, vital_type)
      DO UPDATE SET
        min_value = EXCLUDED.min_value,
        max_value = EXCLUDED.max_value,
        unit = COALESCE(EXCLUDED.unit, vital_thresholds.unit)
      RETURNING *
    `;
    const result: QueryResult = await this.pool.query(sql, [
      facilityId,
      dto.vitalType,
      dto.minValue ?? null,
      dto.maxValue ?? null,
      dto.unit ?? '',
    ]);

    this.logger.log(
      `Threshold upserted: ${dto.vitalType} [${dto.minValue ?? '-∞'},${dto.maxValue ?? '∞'}]`,
    );
    return rowToThreshold(result.rows[0]);
  }
}

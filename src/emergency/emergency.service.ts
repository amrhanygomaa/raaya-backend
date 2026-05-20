import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { TriggerSosDto } from './dto/trigger-sos.dto';

interface EmergencyAlert {
  id: string;
  facility_id: string;
  resident_id: string | null;
  triggered_by: string;
  alert_type: string;
  status: string;
  location: string | null;
  notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

@Injectable()
export class EmergencyService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async triggerSos(facilityId: string, dto: TriggerSosDto): Promise<EmergencyAlert> {
    const res = await this.pool.query<EmergencyAlert>(
      `INSERT INTO emergency_alerts
         (facility_id, resident_id, triggered_by, alert_type, status, location, notes)
       VALUES ($1, $2, $3, 'sos', 'active', $4, $5)
       RETURNING *`,
      [facilityId, dto.residentId ?? null, dto.triggeredBy, dto.location ?? null, dto.notes ?? null],
    );
    return res.rows[0];
  }

  async findActive(facilityId: string): Promise<EmergencyAlert[]> {
    const res = await this.pool.query<EmergencyAlert>(
      `SELECT * FROM emergency_alerts
       WHERE facility_id = $1 AND status = 'active'
       ORDER BY created_at DESC`,
      [facilityId],
    );
    return res.rows;
  }

  async findAll(facilityId: string, limit = 50): Promise<EmergencyAlert[]> {
    const res = await this.pool.query<EmergencyAlert>(
      `SELECT * FROM emergency_alerts
       WHERE facility_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [facilityId, limit],
    );
    return res.rows;
  }

  async resolve(facilityId: string, alertId: string, resolvedBy: string): Promise<EmergencyAlert> {
    const res = await this.pool.query<EmergencyAlert>(
      `UPDATE emergency_alerts
       SET status = 'resolved', resolved_by = $3, resolved_at = NOW()
       WHERE id = $1 AND facility_id = $2
       RETURNING *`,
      [alertId, facilityId, resolvedBy],
    );
    if (res.rowCount === 0) {
      throw new NotFoundException('Emergency alert not found');
    }
    return res.rows[0];
  }
}

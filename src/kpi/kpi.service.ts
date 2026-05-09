/**
 * US-07-01 – KpiService
 *
 * Aggregates metrics from existing tables for the admin dashboard:
 *  - Medication adherence   (dose_logs)
 *  - Family engagement      (media_items + visits)
 *  - Critical-alert count   (vital_alerts)
 *  - Complaint closure       (complaints)
 *
 * Every query is facility-scoped.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { PG_POOL } from '../database/database.module';
import {
  KpiDashboard,
  MedicationAdherenceKpi,
  FamilyEngagementKpi,
  CriticalAlertKpi,
  ComplaintClosureKpi,
} from './kpi.schema';

@Injectable()
export class KpiService {
  private readonly logger = new Logger(KpiService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Returns a full KPI dashboard for the given facility and time window.
   * @param days  Number of days to look back (default 30).
   */
  async getDashboard(
    facilityId: string,
    days = 30,
  ): Promise<KpiDashboard> {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);

    const [
      medicationAdherence,
      familyEngagement,
      criticalAlerts,
      complaintClosure,
    ] = await Promise.all([
      this.getMedicationAdherence(facilityId, from, to),
      this.getFamilyEngagement(facilityId, from, to),
      this.getCriticalAlerts(facilityId, from, to),
      this.getComplaintClosure(facilityId, from, to),
    ]);

    return {
      facilityId,
      generatedAt: new Date().toISOString(),
      period: {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
        days,
      },
      medicationAdherence,
      familyEngagement,
      criticalAlerts,
      complaintClosure,
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  MEDICATION ADHERENCE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  private async getMedicationAdherence(
    facilityId: string,
    from: Date,
    to: Date,
  ): Promise<MedicationAdherenceKpi> {
    const sql = `
      SELECT
        COUNT(*)::int                                      AS total,
        COUNT(*) FILTER (WHERE status = 'given')::int      AS given,
        COUNT(*) FILTER (WHERE status = 'missed')::int     AS missed,
        COUNT(*) FILTER (WHERE status = 'skipped')::int    AS skipped,
        COUNT(*) FILTER (WHERE status = 'pending')::int    AS pending
      FROM dose_logs
      WHERE facility_id = $1
        AND scheduled_time >= $2
        AND scheduled_time <= $3
    `;
    const result: QueryResult = await this.pool.query(sql, [
      facilityId,
      from.toISOString(),
      to.toISOString(),
    ]);
    const r = result.rows[0];
    const total = r.total as number;
    const given = r.given as number;

    return {
      totalDoses: total,
      givenDoses: given,
      missedDoses: r.missed as number,
      skippedDoses: r.skipped as number,
      pendingDoses: r.pending as number,
      adherencePercentage:
        total > 0 ? Math.round((given / total) * 10000) / 100 : 0,
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  FAMILY ENGAGEMENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  private async getFamilyEngagement(
    facilityId: string,
    from: Date,
    to: Date,
  ): Promise<FamilyEngagementKpi> {
    const mediaSql = `
      SELECT
        COUNT(*)::int                                           AS total,
        COUNT(*) FILTER (WHERE status = 'confirmed')::int       AS confirmed
      FROM media_items
      WHERE facility_id = $1
        AND created_at >= $2
        AND created_at <= $3
    `;
    const visitSql = `
      SELECT
        COUNT(*)::int                                           AS total,
        COUNT(*) FILTER (WHERE status = 'approved')::int        AS approved,
        COUNT(*) FILTER (WHERE status = 'completed')::int       AS completed,
        COUNT(*) FILTER (WHERE status = 'pending')::int         AS pending
      FROM visits
      WHERE facility_id = $1
        AND created_at >= $2
        AND created_at <= $3
    `;

    const [mediaRes, visitRes] = await Promise.all([
      this.pool.query(mediaSql, [facilityId, from.toISOString(), to.toISOString()]),
      this.pool.query(visitSql, [facilityId, from.toISOString(), to.toISOString()]),
    ]);

    const m = mediaRes.rows[0];
    const v = visitRes.rows[0];

    return {
      totalMediaItems: m.total as number,
      confirmedMediaItems: m.confirmed as number,
      totalVisits: v.total as number,
      approvedVisits: v.approved as number,
      completedVisits: v.completed as number,
      pendingVisits: v.pending as number,
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  CRITICAL ALERTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  private async getCriticalAlerts(
    facilityId: string,
    from: Date,
    to: Date,
  ): Promise<CriticalAlertKpi> {
    const statusSql = `
      SELECT
        COUNT(*)::int                                            AS total,
        COUNT(*) FILTER (WHERE status = 'active')::int           AS active,
        COUNT(*) FILTER (WHERE status = 'acknowledged')::int     AS acknowledged,
        COUNT(*) FILTER (WHERE status = 'resolved')::int         AS resolved
      FROM vital_alerts
      WHERE facility_id = $1
        AND created_at >= $2
        AND created_at <= $3
    `;
    const byTypeSql = `
      SELECT vital_type, COUNT(*)::int AS cnt
      FROM vital_alerts
      WHERE facility_id = $1
        AND created_at >= $2
        AND created_at <= $3
      GROUP BY vital_type
      ORDER BY cnt DESC
    `;

    const [statusRes, byTypeRes] = await Promise.all([
      this.pool.query(statusSql, [facilityId, from.toISOString(), to.toISOString()]),
      this.pool.query(byTypeSql, [facilityId, from.toISOString(), to.toISOString()]),
    ]);

    const s = statusRes.rows[0];
    const alertsByType: Record<string, number> = {};
    for (const row of byTypeRes.rows) {
      alertsByType[row.vital_type as string] = row.cnt as number;
    }

    return {
      totalAlerts: s.total as number,
      activeAlerts: s.active as number,
      acknowledgedAlerts: s.acknowledged as number,
      resolvedAlerts: s.resolved as number,
      alertsByType,
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  COMPLAINT CLOSURE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  private async getComplaintClosure(
    facilityId: string,
    from: Date,
    to: Date,
  ): Promise<ComplaintClosureKpi> {
    const sql = `
      SELECT
        COUNT(*)::int                                             AS total,
        COUNT(*) FILTER (WHERE status = 'open')::int              AS open,
        COUNT(*) FILTER (WHERE status = 'in_progress')::int       AS in_progress,
        COUNT(*) FILTER (WHERE status = 'resolved')::int          AS resolved,
        COUNT(*) FILTER (WHERE status = 'closed')::int            AS closed,
        AVG(
          EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600
        ) FILTER (WHERE resolved_at IS NOT NULL)                  AS avg_hours
      FROM complaints
      WHERE facility_id = $1
        AND created_at >= $2
        AND created_at <= $3
    `;
    const result: QueryResult = await this.pool.query(sql, [
      facilityId,
      from.toISOString(),
      to.toISOString(),
    ]);
    const r = result.rows[0];
    const total = r.total as number;
    const resolved = (r.resolved as number) + (r.closed as number);

    return {
      totalComplaints: total,
      openComplaints: r.open as number,
      inProgressComplaints: r.in_progress as number,
      resolvedComplaints: r.resolved as number,
      closedComplaints: r.closed as number,
      closureRate:
        total > 0 ? Math.round((resolved / total) * 10000) / 100 : 0,
      avgResolutionHours: r.avg_hours != null
        ? Math.round(Number(r.avg_hours) * 100) / 100
        : null,
    };
  }
}

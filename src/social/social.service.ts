import { Injectable, Inject, Logger } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { PG_POOL } from '../database/database.module';
import {
  SocialSpecialistAssessmentTool,
  SocialSpecialistKpi,
  SocialSpecialistNeed,
  SocialSpecialistResidentScore,
} from './social.schema';
import { CreateSocialNeedDto } from './dto/create-social-need.dto';
import { CreateSocialAssessmentDto } from './dto/create-social-assessment.dto';

function rowToNeed(row: Record<string, unknown>): SocialSpecialistNeed {
  return {
    id: row.id as string,
    facilityId: row.facility_id as string,
    type: row.type as string,
    roomNumber: row.room_number as string,
    isUrgent: row.is_urgent as boolean,
    label: row.label as string,
    createdBy: row.created_by as string,
    createdAt:
      (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
  };
}

function rowToTool(
  row: Record<string, unknown>,
): SocialSpecialistAssessmentTool {
  return {
    id: row.id as string,
    facilityId: row.facility_id as string,
    name: row.name as string,
    subtitle: (row.subtitle as string) ?? '',
    score: row.score as string,
    status: row.status as string,
    icon: row.icon as string,
    createdAt:
      (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
  };
}

function initialsFromName(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getNeeds(facilityId: string): Promise<SocialSpecialistNeed[]> {
    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(
      `SELECT * FROM social_needs WHERE facility_id = $1 ORDER BY is_urgent DESC, created_at DESC`,
      [facilityId],
    );
    return result.rows.map(rowToNeed);
  }

  async createNeed(
    facilityId: string,
    userId: string,
    dto: CreateSocialNeedDto,
  ): Promise<SocialSpecialistNeed> {
    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(
      `
        INSERT INTO social_needs
          (facility_id, type, room_number, is_urgent, label, created_by)
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING *
      `,
      [
        facilityId,
        dto.type,
        dto.roomNumber,
        dto.isUrgent ?? false,
        dto.label,
        userId,
      ],
    );
    this.logger.log(`Social need created: ${String(result.rows[0].id)}`);
    return rowToNeed(result.rows[0]);
  }

  async getAssessmentTools(
    facilityId: string,
  ): Promise<SocialSpecialistAssessmentTool[]> {
    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(
      `SELECT * FROM social_assessment_tools WHERE facility_id = $1 ORDER BY created_at DESC`,
      [facilityId],
    );

    if (result.rowCount && result.rowCount > 0) {
      return result.rows.map(rowToTool);
    }

    const defaults = [
      {
        name: 'التقييم النفسي',
        subtitle: 'مؤشرات المزاج والقلق',
        score: '0/10',
        status: 'جديد',
        icon: 'psychology',
      },
      {
        name: 'التقييم الأسري',
        subtitle: 'الدعم والتواصل العائلي',
        score: '0/10',
        status: 'جديد',
        icon: 'family_restroom',
      },
      {
        name: 'التقييم الاجتماعي',
        subtitle: 'العزلة والمشاركة المجتمعية',
        score: '0/10',
        status: 'جديد',
        icon: 'groups',
      },
    ];

    const inserted: QueryResult<Record<string, unknown>> =
      await this.pool.query<Record<string, unknown>>(
        `
        INSERT INTO social_assessment_tools
          (facility_id, name, subtitle, score, status, icon)
        SELECT $1, tool.name, tool.subtitle, tool.score, tool.status, tool.icon
          FROM jsonb_to_recordset($2::jsonb)
            AS tool(name text, subtitle text, score text, status text, icon text)
        RETURNING *
      `,
        [facilityId, JSON.stringify(defaults)],
      );

    return inserted.rows.map(rowToTool);
  }

  async getResidentScores(
    facilityId: string,
  ): Promise<SocialSpecialistResidentScore[]> {
    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(
      `
        SELECT
          r.id,
          TRIM(r.first_name || ' ' || r.last_name) AS name,
          COALESCE(r.room_number, '') AS room,
          COALESCE(sa.scores, '{}'::jsonb) AS scores,
          COALESCE(sa.needs_intervention, FALSE) AS is_urgent,
          CASE
            WHEN COALESCE(sa.needs_intervention, FALSE) THEN 'critical'
            WHEN sa.id IS NULL THEN 'monitoring'
            ELSE 'stable'
          END AS health_status,
          COALESCE(sa.created_at, r.created_at) AS last_assessment
        FROM residents r
        LEFT JOIN LATERAL (
          SELECT * FROM social_assessments s
           WHERE s.resident_id = r.id AND s.facility_id = r.facility_id
           ORDER BY s.created_at DESC
           LIMIT 1
        ) sa ON TRUE
        WHERE r.facility_id = $1
        ORDER BY r.room_number NULLS LAST, r.last_name, r.first_name
      `,
      [facilityId],
    );

    return result.rows.map((row: Record<string, unknown>) => {
      const name = row.name as string;
      const lastAssessment =
        (row.last_assessment as Date)?.toISOString?.() ??
        (row.last_assessment as string);
      return {
        id: row.id as string,
        name,
        initials: initialsFromName(name),
        room: row.room as string,
        date: lastAssessment?.slice(0, 10) ?? '',
        scores: (row.scores as Record<string, number>) ?? {},
        isUrgent: row.is_urgent as boolean,
        healthStatus: row.health_status as string,
        lastAssessment,
      };
    });
  }

  async createAssessment(
    facilityId: string,
    userId: string,
    dto: CreateSocialAssessmentDto,
  ): Promise<SocialSpecialistResidentScore[]> {
    await this.pool.query<Record<string, unknown>>(
      `
        INSERT INTO social_assessments
          (facility_id, resident_id, scores, needs_intervention, notes, assessed_by)
        VALUES ($1,$2,$3,$4,$5,$6)
      `,
      [
        facilityId,
        dto.residentId,
        JSON.stringify(dto.scores),
        dto.needsIntervention ?? false,
        dto.notes ?? null,
        userId,
      ],
    );
    this.logger.log(`Social assessment created for resident ${dto.residentId}`);
    return this.getResidentScores(facilityId);
  }

  async getKpis(facilityId: string): Promise<SocialSpecialistKpi[]> {
    const [needsResult, complaintsResult, assessmentsResult, residentsResult] =
      await Promise.all([
        this.pool.query<Record<string, unknown>>(
          `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_urgent)::int AS urgent FROM social_needs WHERE facility_id = $1`,
          [facilityId],
        ),
        this.pool.query<Record<string, unknown>>(
          `SELECT COUNT(*)::int AS open_count FROM complaints WHERE facility_id = $1 AND status IN ('open', 'in_progress')`,
          [facilityId],
        ),
        this.pool.query<Record<string, unknown>>(
          `SELECT COUNT(DISTINCT resident_id)::int AS assessed FROM social_assessments WHERE facility_id = $1`,
          [facilityId],
        ),
        this.pool.query<Record<string, unknown>>(
          `SELECT COUNT(*)::int AS total FROM residents WHERE facility_id = $1`,
          [facilityId],
        ),
      ]);

    const needs = needsResult.rows[0];
    const complaints = complaintsResult.rows[0];
    const assessments = assessmentsResult.rows[0];
    const residents = residentsResult.rows[0];
    const residentsTotal = Number(residents.total) || 0;
    const assessedTotal = Number(assessments.assessed) || 0;
    const openNeeds = Number(needs.total) || 0;
    const urgentNeeds = Number(needs.urgent) || 0;
    const openComplaints = Number(complaints.open_count) || 0;
    const coverage =
      residentsTotal > 0
        ? Math.round((assessedTotal / residentsTotal) * 100)
        : 0;

    return [
      {
        id: 'open_needs',
        label: 'الاحتياجات المفتوحة',
        value: String(openNeeds),
        trend: `${urgentNeeds} عاجل`,
        isPositive: urgentNeeds === 0,
      },
      {
        id: 'open_complaints',
        label: 'الشكاوى المفتوحة',
        value: String(openComplaints),
        trend: 'قيد المتابعة',
        isPositive: openComplaints === 0,
      },
      {
        id: 'assessment_coverage',
        label: 'تغطية التقييمات',
        value: `${coverage}%`,
        trend: `${assessedTotal}/${residentsTotal}`,
        isPositive: coverage >= 80,
      },
    ];
  }

  async getAssessmentHistory(
    facilityId: string,
    residentId?: string,
  ): Promise<object[]> {
    const params: unknown[] = [facilityId];
    const residentFilter = residentId ? `AND resident_id = $2` : '';
    if (residentId) params.push(residentId);

    const result = await this.pool.query<Record<string, unknown>>(
      `SELECT id, resident_id, scores, needs_intervention, notes, created_at
       FROM social_assessments
       WHERE facility_id = $1 ${residentFilter}
       ORDER BY created_at DESC
       LIMIT 20`,
      params,
    );

    const rows = result.rows;

    return rows.map((row, idx) => {
      const scores = (row.scores as Record<string, number>) ?? {};
      const values = Object.values(scores).filter((v) => typeof v === 'number');
      const total = values.length * 10;
      const scoreSum = values.reduce((a, b) => a + b, 0);

      // حساب الاتجاه بالمقارنة مع السجل التالي (الأقدم)
      let trend = 'stable';
      if (idx < rows.length - 1) {
        const prevScores =
          (rows[idx + 1].scores as Record<string, number>) ?? {};
        const prevValues = Object.values(prevScores).filter(
          (v) => typeof v === 'number',
        );
        const prevSum = prevValues.reduce((a, b) => a + b, 0);
        if (scoreSum > prevSum) trend = 'up';
        else if (scoreSum < prevSum) trend = 'down';
      }

      const createdAt = row.created_at as Date;
      return {
        id: row.id,
        residentId: row.resident_id,
        date: createdAt?.toISOString?.()?.slice(0, 10) ?? '',
        score: scoreSum,
        total: total > 0 ? String(total) : '100',
        trend,
        needsIntervention: row.needs_intervention,
        notes: row.notes,
      };
    });
  }
}

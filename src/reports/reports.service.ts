import { Inject, Injectable, Logger } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { PG_POOL } from '../database/database.module';
import { SendNursingReportDto } from './dto/send-nursing-report.dto';
import { UpdateNursingReportSettingsDto } from './dto/update-nursing-report-settings.dto';
import {
  NursingReportDelivery,
  NursingReportExport,
  NursingReportPreview,
  NursingReportSettings,
  NursingReportType,
  ReportCompletenessItem,
} from './reports.schema';

function normalizeReportType(type?: string): NursingReportType {
  if (type === 'weekly' || type === 'تقرير أسبوعي') return 'weekly';
  if (type === 'critical' || type === 'تنبيه حرج' || type === 'التنبيه الحرج')
    return 'critical';
  if (type === 'medications' || type === 'تقرير أدوية') return 'medications';
  return 'daily';
}

function rowToDelivery(row: Record<string, unknown>): NursingReportDelivery {
  return {
    id: row.id as string,
    facilityId: row.facility_id as string,
    reportType: row.report_type as NursingReportType,
    recipients: (row.recipients as string[]) ?? [],
    status: row.status as string,
    sentBy: row.sent_by as string,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt:
      (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
  };
}

function rowToSettings(row: Record<string, unknown>): NursingReportSettings {
  return {
    id: row.id as string,
    facilityId: row.facility_id as string,
    dailyTime: row.daily_time as string,
    weeklyDay: row.weekly_day as string,
    criticalAlertEnabled: row.critical_alert_enabled as boolean,
    missedMedicationAlertEnabled:
      row.missed_medication_alert_enabled as boolean,
    recipients: (row.recipients as string[]) ?? [],
    createdAt:
      (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
    updatedAt:
      (row.updated_at as Date)?.toISOString?.() ?? (row.updated_at as string),
  };
}

function percent(done: number, total: number): number {
  if (total <= 0) return 100;
  return Math.min(100, Math.round((done / total) * 100));
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getNursingPreview(
    facilityId: string,
    reportType?: string,
  ): Promise<NursingReportPreview> {
    const type = normalizeReportType(reportType);
    const [metrics, critical, weekly, completeness] = await Promise.all([
      this.getCurrentMetrics(facilityId),
      this.getLatestCriticalAlert(facilityId),
      this.getWeeklyMetrics(facilityId),
      this.getCompleteness(facilityId),
    ]);

    if (type === 'weekly') {
      return {
        reportType: type,
        generatedAt: new Date().toISOString(),
        title: 'تقرير أسبوعي',
        summary: 'ملخص الاتجاهات التشغيلية والتمريضية خلال آخر ٧ أيام.',
        metrics: [
          {
            label: 'عدد المقيمين النشطين',
            value: String(metrics.activeResidents),
          },
          { label: 'قراءات حيوية مسجلة', value: String(weekly.vitalsCount) },
          { label: 'ملاحظات تمريضية', value: String(weekly.notesCount) },
          {
            label: 'الالتزام الدوائي',
            value: `${weekly.medicationCompliance}%`,
          },
        ],
        notes: [
          `تم تسجيل ${weekly.vitalsCount} قراءة حيوية خلال الأسبوع.`,
          `عدد الشكاوى المفتوحة حالياً ${metrics.openComplaints}.`,
        ],
        completeness,
      };
    }

    if (type === 'critical') {
      return {
        reportType: type,
        generatedAt: new Date().toISOString(),
        title: 'تنبيه حرج',
        summary: critical
          ? `تنبيه ${critical.vitalType} للمقيم ${critical.residentName}.`
          : 'لا توجد تنبيهات حرجة نشطة حالياً.',
        metrics: [
          { label: 'المقيم', value: critical?.residentName ?? 'غير محدد' },
          { label: 'نوع الحالة', value: critical?.vitalType ?? 'لا يوجد' },
          { label: 'القراءة', value: critical?.recordedValue ?? '-' },
          { label: 'وقت التنبيه', value: critical?.createdAt ?? '-' },
        ],
        notes: critical
          ? ['يوصى بالتواصل الفوري مع الطبيب المشرف ومتابعة القياسات.']
          : ['لا توجد حالات تستدعي إرسال تنبيه فوري الآن.'],
        completeness,
      };
    }

    if (type === 'medications') {
      return {
        reportType: type,
        generatedAt: new Date().toISOString(),
        title: 'تقرير أدوية',
        summary: 'ملخص الالتزام الدوائي والجرعات خلال اليوم.',
        metrics: [
          { label: 'إجمالي الجرعات اليوم', value: String(metrics.todayDoses) },
          { label: 'جرعات منفذة', value: String(metrics.givenDoses) },
          { label: 'جرعات متبقية', value: String(metrics.pendingDoses) },
          {
            label: 'الالتزام بالأدوية',
            value: `${metrics.medicationCompliance}%`,
          },
        ],
        notes: [
          metrics.pendingDoses > 0
            ? `يوجد ${metrics.pendingDoses} جرعة لم تكتمل بعد.`
            : 'لا توجد جرعات معلقة حالياً.',
        ],
        completeness,
      };
    }

    return {
      reportType: type,
      generatedAt: new Date().toISOString(),
      title: 'تقرير يومي',
      summary:
        'ملخص الوردية الحالي بناءً على بيانات المقيمين والقراءات والأدوية.',
      metrics: [
        { label: 'عدد المقيمين', value: String(metrics.activeResidents) },
        { label: 'حالات حرجة نشطة', value: String(metrics.criticalAlerts) },
        {
          label: 'الالتزام بالأدوية',
          value: `${metrics.medicationCompliance}%`,
        },
        { label: 'ملاحظات اليوم', value: String(metrics.todayNotes) },
      ],
      notes: [
        `تم تسجيل ${metrics.todayVitals} قراءة حيوية اليوم.`,
        `عدد الشكاوى المفتوحة ${metrics.openComplaints}.`,
      ],
      completeness,
    };
  }

  async getCompleteness(facilityId: string): Promise<ReportCompletenessItem[]> {
    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(
      `
        SELECT
          (SELECT COUNT(*)::int FROM residents WHERE facility_id = $1 AND status = 'active') AS active_residents,
          (SELECT COUNT(DISTINCT resident_id)::int FROM vital_signs WHERE facility_id = $1 AND recorded_at::date = CURRENT_DATE) AS residents_with_vitals,
          (SELECT COUNT(*)::int FROM dose_logs WHERE facility_id = $1 AND scheduled_time::date = CURRENT_DATE) AS today_doses,
          (SELECT COUNT(*)::int FROM dose_logs WHERE facility_id = $1 AND scheduled_time::date = CURRENT_DATE AND status = 'given') AS given_doses,
          (SELECT COUNT(*)::int FROM nursing_notes WHERE facility_id = $1 AND created_at::date = CURRENT_DATE) AS today_notes
      `,
      [facilityId],
    );
    const row = result.rows[0] ?? {};
    const activeResidents = Number(row.active_residents) || 0;
    const residentsWithVitals = Number(row.residents_with_vitals) || 0;
    const todayDoses = Number(row.today_doses) || 0;
    const givenDoses = Number(row.given_doses) || 0;
    const todayNotes = Number(row.today_notes) || 0;

    return [
      {
        title: 'القراءات الحيوية',
        value: `${percent(residentsWithVitals, activeResidents)}%`,
        percentage: percent(residentsWithVitals, activeResidents) / 100,
      },
      {
        title: 'تأكيد الأدوية',
        value: `${percent(givenDoses, todayDoses)}%`,
        percentage: percent(givenDoses, todayDoses) / 100,
      },
      {
        title: 'ملاحظات الممرضة',
        value: `${percent(todayNotes, activeResidents)}%`,
        percentage: percent(todayNotes, activeResidents) / 100,
      },
    ];
  }

  async exportNursingReport(
    facilityId: string,
    reportType?: string,
    format = 'pdf',
  ): Promise<NursingReportExport> {
    const preview = await this.getNursingPreview(facilityId, reportType);
    const normalizedFormat = format === 'txt' ? 'txt' : 'pdf';
    const date = new Date().toISOString().slice(0, 10);
    const metrics = preview.metrics
      .map((metric) => `${metric.label}: ${metric.value}`)
      .join('\n');
    const notes = preview.notes.map((note) => `- ${note}`).join('\n');
    const completeness = preview.completeness
      .map((item) => `${item.title}: ${item.value}`)
      .join('\n');
    return {
      ...preview,
      format: normalizedFormat,
      filename: `nursing-${preview.reportType}-${date}.${normalizedFormat}`,
      content: `${preview.title}\n${preview.summary}\n\n${metrics}\n\n${notes}\n\n${completeness}`,
    };
  }

  async getHistory(facilityId: string): Promise<NursingReportDelivery[]> {
    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(
      `SELECT * FROM nursing_report_deliveries WHERE facility_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [facilityId],
    );
    return result.rows.map(rowToDelivery);
  }

  async getSettings(facilityId: string): Promise<NursingReportSettings> {
    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(
      `
        WITH inserted AS (
          INSERT INTO nursing_report_settings (facility_id)
          VALUES ($1)
          ON CONFLICT (facility_id) DO NOTHING
          RETURNING *
        )
        SELECT * FROM inserted
        UNION ALL
        SELECT * FROM nursing_report_settings WHERE facility_id = $1
        LIMIT 1
      `,
      [facilityId],
    );
    return rowToSettings(result.rows[0]);
  }

  async updateSettings(
    facilityId: string,
    dto: UpdateNursingReportSettingsDto,
  ): Promise<NursingReportSettings> {
    await this.getSettings(facilityId);
    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(
      `
        UPDATE nursing_report_settings
        SET
          daily_time = COALESCE($2::text, daily_time),
          weekly_day = COALESCE($3::text, weekly_day),
          critical_alert_enabled = COALESCE($4::boolean, critical_alert_enabled),
          missed_medication_alert_enabled = COALESCE($5::boolean, missed_medication_alert_enabled),
          recipients = COALESCE($6::text[], recipients)
        WHERE facility_id = $1
        RETURNING *
      `,
      [
        facilityId,
        dto.dailyTime ?? null,
        dto.weeklyDay ?? null,
        dto.criticalAlertEnabled ?? null,
        dto.missedMedicationAlertEnabled ?? null,
        dto.recipients ?? null,
      ],
    );
    return rowToSettings(result.rows[0]);
  }

  async sendNursingReport(
    facilityId: string,
    userId: string,
    dto: SendNursingReportDto,
  ): Promise<NursingReportDelivery> {
    const reportType = normalizeReportType(dto.reportType);
    const preview = await this.getNursingPreview(facilityId, reportType);
    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(
      `
        INSERT INTO nursing_report_deliveries
          (facility_id, report_type, recipients, status, sent_by, metadata)
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING *
      `,
      [
        facilityId,
        reportType,
        dto.recipients ?? [],
        'sent',
        userId,
        JSON.stringify({ preview, ...(dto.metadata ?? {}) }),
      ],
    );
    this.logger.log(`Nursing report sent: ${String(result.rows[0].id)}`);
    return rowToDelivery(result.rows[0]);
  }

  private async getCurrentMetrics(facilityId: string) {
    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(
      `
        SELECT
          (SELECT COUNT(*)::int FROM residents WHERE facility_id = $1 AND status = 'active') AS active_residents,
          (SELECT COUNT(DISTINCT resident_id)::int FROM vital_alerts WHERE facility_id = $1 AND severity = 'critical' AND status = 'active') AS critical_alerts,
          (SELECT COUNT(*)::int FROM vital_signs WHERE facility_id = $1 AND recorded_at::date = CURRENT_DATE) AS today_vitals,
          (SELECT COUNT(*)::int FROM nursing_notes WHERE facility_id = $1 AND created_at::date = CURRENT_DATE) AS today_notes,
          (SELECT COUNT(*)::int FROM complaints WHERE facility_id = $1 AND status IN ('open', 'in_progress')) AS open_complaints,
          (SELECT COUNT(*)::int FROM dose_logs WHERE facility_id = $1 AND scheduled_time::date = CURRENT_DATE) AS today_doses,
          (SELECT COUNT(*)::int FROM dose_logs WHERE facility_id = $1 AND scheduled_time::date = CURRENT_DATE AND status = 'given') AS given_doses,
          (SELECT COUNT(*)::int FROM dose_logs WHERE facility_id = $1 AND scheduled_time::date = CURRENT_DATE AND status IN ('pending', 'missed')) AS pending_doses
      `,
      [facilityId],
    );
    const row = result.rows[0] ?? {};
    const todayDoses = Number(row.today_doses) || 0;
    const givenDoses = Number(row.given_doses) || 0;
    return {
      activeResidents: Number(row.active_residents) || 0,
      criticalAlerts: Number(row.critical_alerts) || 0,
      todayVitals: Number(row.today_vitals) || 0,
      todayNotes: Number(row.today_notes) || 0,
      openComplaints: Number(row.open_complaints) || 0,
      todayDoses,
      givenDoses,
      pendingDoses: Number(row.pending_doses) || 0,
      medicationCompliance: percent(givenDoses, todayDoses),
    };
  }

  private async getWeeklyMetrics(facilityId: string) {
    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(
      `
        SELECT
          (SELECT COUNT(*)::int FROM vital_signs WHERE facility_id = $1 AND recorded_at >= NOW() - INTERVAL '7 days') AS vitals_count,
          (SELECT COUNT(*)::int FROM nursing_notes WHERE facility_id = $1 AND created_at >= NOW() - INTERVAL '7 days') AS notes_count,
          (SELECT COUNT(*)::int FROM dose_logs WHERE facility_id = $1 AND scheduled_time >= NOW() - INTERVAL '7 days') AS total_doses,
          (SELECT COUNT(*)::int FROM dose_logs WHERE facility_id = $1 AND scheduled_time >= NOW() - INTERVAL '7 days' AND status = 'given') AS given_doses
      `,
      [facilityId],
    );
    const row = result.rows[0] ?? {};
    const totalDoses = Number(row.total_doses) || 0;
    const givenDoses = Number(row.given_doses) || 0;
    return {
      vitalsCount: Number(row.vitals_count) || 0,
      notesCount: Number(row.notes_count) || 0,
      medicationCompliance: percent(givenDoses, totalDoses),
    };
  }

  private async getLatestCriticalAlert(facilityId: string) {
    const result: QueryResult<Record<string, unknown>> = await this.pool.query<
      Record<string, unknown>
    >(
      `
        SELECT
          va.vital_type,
          va.recorded_value,
          va.created_at,
          TRIM(r.first_name || ' ' || r.last_name) AS resident_name
        FROM vital_alerts va
        JOIN residents r ON r.id = va.resident_id
        WHERE va.facility_id = $1
          AND va.severity = 'critical'
          AND va.status = 'active'
        ORDER BY va.created_at DESC
        LIMIT 1
      `,
      [facilityId],
    );
    if (!result.rowCount) return null;
    const row = result.rows[0];
    return {
      vitalType: row.vital_type as string,
      recordedValue: String(row.recorded_value),
      residentName: row.resident_name as string,
      createdAt:
        (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
    };
  }
}

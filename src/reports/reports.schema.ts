export type NursingReportType = 'daily' | 'weekly' | 'critical' | 'medications';

export interface ReportMetric {
  label: string;
  value: string;
}

export interface ReportCompletenessItem {
  title: string;
  value: string;
  percentage: number;
}

export interface NursingReportPreview {
  reportType: NursingReportType;
  generatedAt: string;
  title: string;
  summary: string;
  metrics: ReportMetric[];
  notes: string[];
  completeness: ReportCompletenessItem[];
}

export interface NursingReportExport extends NursingReportPreview {
  format: string;
  filename: string;
  content: string;
}

export interface NursingReportDelivery {
  id: string;
  facilityId: string;
  reportType: NursingReportType;
  recipients: string[];
  status: string;
  sentBy: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface NursingReportSettings {
  id: string;
  facilityId: string;
  dailyTime: string;
  weeklyDay: string;
  criticalAlertEnabled: boolean;
  missedMedicationAlertEnabled: boolean;
  recipients: string[];
  createdAt: string;
  updatedAt: string;
}

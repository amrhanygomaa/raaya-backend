/**
 * US-07-01: KPI aggregate response types
 *
 * Defines the shape of the admin dashboard KPI endpoint response.
 */

export interface MedicationAdherenceKpi {
  totalDoses: number;
  givenDoses: number;
  missedDoses: number;
  skippedDoses: number;
  pendingDoses: number;
  adherencePercentage: number;
}

export interface FamilyEngagementKpi {
  totalMediaItems: number;
  confirmedMediaItems: number;
  totalVisits: number;
  approvedVisits: number;
  completedVisits: number;
  pendingVisits: number;
}

export interface CriticalAlertKpi {
  totalAlerts: number;
  activeAlerts: number;
  acknowledgedAlerts: number;
  resolvedAlerts: number;
  alertsByType: Record<string, number>;
}

export interface ComplaintClosureKpi {
  totalComplaints: number;
  openComplaints: number;
  inProgressComplaints: number;
  resolvedComplaints: number;
  closedComplaints: number;
  closureRate: number;
  avgResolutionHours: number | null;
}

export interface KpiDashboard {
  facilityId: string;
  generatedAt: string;
  period: {
    from: string;
    to: string;
    days: number;
  };
  medicationAdherence: MedicationAdherenceKpi;
  familyEngagement: FamilyEngagementKpi;
  criticalAlerts: CriticalAlertKpi;
  complaintClosure: ComplaintClosureKpi;
}

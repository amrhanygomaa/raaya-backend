export interface SocialSpecialistNeed {
  id: string;
  facilityId: string;
  type: string;
  roomNumber: string;
  isUrgent: boolean;
  label: string;
  createdBy: string;
  createdAt: string;
}

export interface SocialSpecialistAssessmentTool {
  id: string;
  facilityId: string;
  name: string;
  subtitle: string;
  score: string;
  status: string;
  icon: string;
  createdAt: string;
}

export interface SocialSpecialistResidentScore {
  id: string;
  name: string;
  initials: string;
  room: string;
  date: string;
  scores: Record<string, number>;
  isUrgent: boolean;
  healthStatus: string;
  lastAssessment: string;
}

export interface SocialSpecialistKpi {
  id: string;
  label: string;
  value: string;
  trend: string;
  isPositive: boolean;
}

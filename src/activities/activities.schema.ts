/**
 * US-14-01: Activity Sessions schema types
 */

export interface ActivitySession {
  id: string;
  facilityId: string;
  title: string;
  description?: string;
  startTime: string;
  location?: string;
  participants: unknown[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

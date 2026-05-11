/**
 * US-14-06: Memory Moments schema types
 */

export interface MemoryMoment {
  id: string;
  facilityId: string;
  residentId: string;
  imageUrl?: string;
  activityTitle: string;
  appreciations: number;
  uploadedBy: string;
  createdAt: string;
}

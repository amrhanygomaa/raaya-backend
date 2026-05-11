/**
 * US-14-03: Volunteer System schema types
 */

export interface VolunteerProfile {
  id: string;
  userId: string;
  facilityId: string;
  name: string;
  bio?: string;
  location?: string;
  skills: string[];
  hoursLogged: number;
  socialLinks: Record<string, string>;
  cvFileUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VolunteerOpportunity {
  id: string;
  facilityId: string;
  title: string;
  org?: string;
  hours: number;
  points: number;
  tags: string[];
  description?: string;
  totalSlots: number;
  filledSlots: number;
  dateInfo?: string;
  createdAt: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'done' | 'cancelled';

export const VALID_BOOKING_STATUSES: BookingStatus[] = [
  'pending',
  'confirmed',
  'done',
  'cancelled',
];

export interface VolunteerBooking {
  id: string;
  facilityId: string;
  volunteerId: string;
  opportunityId: string;
  status: BookingStatus;
  createdAt: string;
}

export interface VolunteerCertificate {
  id: string;
  volunteerId: string;
  name: string;
  awardDate?: string;
  description?: string;
  isLocked: boolean;
  progress: number;
}

export interface VolunteerRating {
  id: string;
  volunteerId: string;
  fromName: string;
  category?: string;
  score: number;
  comment?: string;
  date: string;
  chips: string[];
  criteriaScores: Record<string, number>;
}

export interface VolunteerReview {
  id: string;
  volunteerId: string;
  toName: string;
  session?: string;
  date: string;
  score: number;
  isPending: boolean;
}

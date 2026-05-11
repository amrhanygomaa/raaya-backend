/**
 * US-15-01: Voice Messages schema types
 */

export type SenderType = 'family' | 'staff' | 'volunteer';

export const VALID_SENDER_TYPES: SenderType[] = [
  'family',
  'staff',
  'volunteer',
];

export interface VoiceMessage {
  id: string;
  facilityId: string;
  residentId: string;
  senderType: SenderType;
  title: string;
  audioUrl?: string;
  durationSeconds: number;
  createdAt: string;
}

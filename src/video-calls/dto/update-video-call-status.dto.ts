import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const CALL_STATUSES = [
  'ringing',
  'active',
  'ended',
  'missed',
  'declined',
] as const;

export class UpdateVideoCallStatusDto {
  @ApiProperty({ enum: CALL_STATUSES, example: 'ended' })
  @IsIn(CALL_STATUSES)
  status: (typeof CALL_STATUSES)[number];
}

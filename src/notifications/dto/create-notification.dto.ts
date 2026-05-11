/**
 * US-15-07 – DTO for creating a notification.
 */

import { IsString, IsNotEmpty, IsIn, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VALID_TYPES } from '../notifications.schema';

export class CreateNotificationDto {
  @ApiProperty({ example: 'nurse-seed' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    example: 'Medication reminder: Aspirin 100mg for Ahmad Al-Rashid at 08:00',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;

  @ApiProperty({
    enum: VALID_TYPES,
    example: 'medication_reminder',
  })
  @IsIn(VALID_TYPES)
  type: string;
}

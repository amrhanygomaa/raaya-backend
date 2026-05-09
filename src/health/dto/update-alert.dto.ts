/**
 * US-06-01 – DTO for acknowledging / resolving an alert.
 */

import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VALID_ALERT_STATUSES } from '../health.schema';

export class UpdateAlertDto {
  @ApiProperty({
    enum: VALID_ALERT_STATUSES,
    example: 'acknowledged',
    description: 'New alert status',
  })
  @IsIn(VALID_ALERT_STATUSES)
  status: string;

  @ApiPropertyOptional({ example: 'Reviewed by Dr. Sami' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

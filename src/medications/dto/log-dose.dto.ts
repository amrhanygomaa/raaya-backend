/**
 * US-04-01 – DTO for logging a dose (creating a dose_log entry).
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VALID_DOSE_STATUSES } from '../medications.schema';

export class LogDoseDto {
  @ApiProperty({ example: 'd1000000-0000-0000-0000-000000000001' })
  @IsString()
  @IsNotEmpty()
  scheduleId: string;

  @ApiProperty({ example: 'a1b2c3d4-0000-0000-0000-000000000001' })
  @IsString()
  @IsNotEmpty()
  residentId: string;

  @ApiProperty({
    example: '2025-05-08T08:00:00.000Z',
    description: 'When the dose was expected (ISO datetime)',
  })
  @IsDateString()
  scheduledTime: string;

  @ApiProperty({
    enum: VALID_DOSE_STATUSES,
    example: 'given',
  })
  @IsIn(VALID_DOSE_STATUSES)
  status: string;

  @ApiPropertyOptional({
    example: '2025-05-08T08:05:00.000Z',
    description: 'When the dose was actually administered (ISO datetime)',
  })
  @IsOptional()
  @IsDateString()
  administeredAt?: string;

  @ApiPropertyOptional({ example: 'Resident refused first attempt' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

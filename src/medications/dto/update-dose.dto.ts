/**
 * US-04-01 – DTO for updating a dose log status (PATCH).
 */

import {
  IsString,
  IsOptional,
  IsIn,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VALID_DOSE_STATUSES } from '../medications.schema';

export class UpdateDoseDto {
  @ApiProperty({
    enum: VALID_DOSE_STATUSES,
    example: 'given',
    description: 'New status for the dose',
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

  @ApiPropertyOptional({ example: 'Administered with water' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

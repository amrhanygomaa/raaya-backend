/**
 * US-04-01 – DTO for updating a medication schedule (PATCH).
 *
 * All fields optional. id, residentId and facilityId are never from body.
 */

import {
  IsString,
  IsOptional,
  IsIn,
  IsDateString,
  IsBoolean,
  IsArray,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VALID_ROUTES, VALID_FREQUENCIES } from '../medications.schema';

export class UpdateScheduleDto {
  @ApiPropertyOptional({ example: 'Aspirin 100mg' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  medicationName?: string;

  @ApiPropertyOptional({ example: '1 tablet' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  dosage?: string;

  @ApiPropertyOptional({ enum: VALID_ROUTES, example: 'oral' })
  @IsOptional()
  @IsIn(VALID_ROUTES)
  route?: string;

  @ApiPropertyOptional({ enum: VALID_FREQUENCIES, example: 'daily' })
  @IsOptional()
  @IsIn(VALID_FREQUENCIES)
  frequency?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['08:00', '20:00'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^\d{2}:\d{2}$/, { each: true, message: 'Each time must be HH:mm' })
  scheduledTimes?: string[];

  @ApiPropertyOptional({ example: '2025-01-10' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Dr. Sami' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  prescriber?: string;

  @ApiPropertyOptional({ example: 'Take with breakfast' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

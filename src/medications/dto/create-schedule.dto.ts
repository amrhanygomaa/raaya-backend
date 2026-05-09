/**
 * US-04-01 – DTO for creating a medication schedule.
 *
 * facilityId is injected from the JWT token (facility scoping).
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsDateString,
  IsBoolean,
  IsArray,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VALID_ROUTES, VALID_FREQUENCIES } from '../medications.schema';

export class CreateScheduleDto {
  @ApiProperty({ example: 'a1b2c3d4-0000-0000-0000-000000000001' })
  @IsString()
  @IsNotEmpty()
  residentId: string;

  @ApiProperty({ example: 'Aspirin 100mg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  medicationName: string;

  @ApiProperty({ example: '1 tablet' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  dosage: string;

  @ApiPropertyOptional({ enum: VALID_ROUTES, default: 'oral', example: 'oral' })
  @IsOptional()
  @IsIn(VALID_ROUTES)
  route?: string;

  @ApiPropertyOptional({ enum: VALID_FREQUENCIES, default: 'daily', example: 'daily' })
  @IsOptional()
  @IsIn(VALID_FREQUENCIES)
  frequency?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['08:00', '20:00'],
    description: 'HH:mm time slots',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^\d{2}:\d{2}$/, { each: true, message: 'Each time must be HH:mm' })
  scheduledTimes?: string[];

  @ApiPropertyOptional({ example: '2025-01-10', description: 'ISO date YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: true })
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

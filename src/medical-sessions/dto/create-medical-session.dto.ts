/**
 * US-13-03 – DTO for creating a medical session.
 */

import {
  IsString,
  IsOptional,
  IsIn,
  IsUUID,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VALID_TYPES } from '../medical-sessions.schema';

export class CreateMedicalSessionDto {
  @ApiProperty({ example: 'a1b2c3d4-0000-0000-0000-000000000001' })
  @IsUUID()
  residentId: string;

  @ApiPropertyOptional({
    enum: VALID_TYPES,
    example: 'doctor',
    description: 'Session type (default: doctor)',
  })
  @IsOptional()
  @IsIn(VALID_TYPES)
  type?: string;

  @ApiPropertyOptional({ example: 'Dr. Sami' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  specialistName?: string;

  @ApiProperty({ example: '2025-05-12' })
  @IsDateString()
  sessionDate: string;

  @ApiPropertyOptional({ example: '10:00' })
  @IsOptional()
  @IsString()
  sessionTime?: string;

  @ApiPropertyOptional({ example: 'Routine follow-up session' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

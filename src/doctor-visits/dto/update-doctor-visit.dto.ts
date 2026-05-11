/**
 * US-13-01 – DTO for updating a doctor visit.
 */

import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDoctorVisitDto {
  @ApiPropertyOptional({ example: 'Dr. Layla' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  doctorName?: string;

  @ApiPropertyOptional({ example: 'Endocrinology' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  specialty?: string;

  @ApiPropertyOptional({ example: '2025-05-20' })
  @IsOptional()
  @IsDateString()
  visitDate?: string;

  @ApiPropertyOptional({ example: 'Follow-up on blood sugar levels' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  purpose?: string;

  @ApiPropertyOptional({ example: 'HbA1c improved to 6.5%' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  results?: string;
}

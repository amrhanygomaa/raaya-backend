/**
 * US-13-01 – DTO for creating a doctor visit.
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDoctorVisitDto {
  @ApiProperty({ example: 'a1b2c3d4-0000-0000-0000-000000000001' })
  @IsUUID()
  residentId: string;

  @ApiProperty({ example: 'Dr. Sami' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  doctorName: string;

  @ApiPropertyOptional({ example: 'Cardiology' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  specialty?: string;

  @ApiProperty({ example: '2025-05-15' })
  @IsDateString()
  visitDate: string;

  @ApiPropertyOptional({ example: 'Routine cardiac checkup' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  purpose?: string;

  @ApiPropertyOptional({ example: 'Heart function normal' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  results?: string;
}

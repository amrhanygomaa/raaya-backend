/**
 * US-13-05 – DTO for creating a prescription.
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

export class CreatePrescriptionDto {
  @ApiProperty({ example: 'a1b2c3d4-0000-0000-0000-000000000001' })
  @IsUUID()
  residentId: string;

  @ApiProperty({ example: 'Metformin 500mg - Daily' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional({ example: 'Dr. Sami' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  doctorName?: string;

  @ApiPropertyOptional({ example: '2025-05-10' })
  @IsOptional()
  @IsDateString()
  prescriptionDate?: string;

  @ApiPropertyOptional({ example: 'https://s3.amazonaws.com/...' })
  @IsOptional()
  @IsString()
  fileUrl?: string;
}

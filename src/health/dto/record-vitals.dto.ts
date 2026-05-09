/**
 * US-06-01 – DTO for recording vital signs.
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordVitalsDto {
  @ApiProperty({ example: 'a1b2c3d4-0000-0000-0000-000000000001' })
  @IsString()
  @IsNotEmpty()
  residentId: string;

  @ApiPropertyOptional({ example: 72, description: 'Heart rate (bpm)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(300)
  heartRate?: number;

  @ApiPropertyOptional({ example: 120, description: 'Systolic BP (mmHg)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(300)
  bloodPressureSystolic?: number;

  @ApiPropertyOptional({ example: 80, description: 'Diastolic BP (mmHg)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(200)
  bloodPressureDiastolic?: number;

  @ApiPropertyOptional({ example: 36.8, description: 'Temperature (°C)' })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(45)
  temperature?: number;

  @ApiPropertyOptional({ example: 16, description: 'Respiratory rate (breaths/min)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  respiratoryRate?: number;

  @ApiPropertyOptional({ example: 98, description: 'Oxygen saturation (%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  oxygenSaturation?: number;

  @ApiPropertyOptional({ example: 95, description: 'Blood glucose (mg/dL)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(600)
  bloodGlucose?: number;

  @ApiPropertyOptional({ example: 72.5, description: 'Weight (kg)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  weight?: number;

  @ApiPropertyOptional({ example: 'Morning check – all normal' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

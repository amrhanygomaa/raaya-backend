/**
 * US-06-01 – DTO for creating or updating a vital threshold (Admin).
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateThresholdDto {
  @ApiProperty({ example: 'heart_rate', description: 'Vital type name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  vitalType: string;

  @ApiPropertyOptional({ example: 60, description: 'Minimum normal value (null = no lower bound)' })
  @IsOptional()
  @IsNumber()
  minValue?: number;

  @ApiPropertyOptional({ example: 100, description: 'Maximum normal value (null = no upper bound)' })
  @IsOptional()
  @IsNumber()
  maxValue?: number;

  @ApiPropertyOptional({ example: 'bpm', description: 'Unit label' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;
}

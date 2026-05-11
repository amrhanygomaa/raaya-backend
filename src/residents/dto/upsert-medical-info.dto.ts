/**
 * US-15-08 – DTO for upserting resident medical info.
 */

import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertMedicalInfoDto {
  @ApiPropertyOptional({
    example: ['Type 2 Diabetes', 'Hypertension'],
    description: 'Array of diagnoses',
  })
  @IsOptional()
  @IsArray()
  diagnoses?: string[];

  @ApiPropertyOptional({
    example: ['Penicillin'],
    description: 'Array of allergies',
  })
  @IsOptional()
  @IsArray()
  allergies?: string[];

  @ApiPropertyOptional({ example: 'A+', description: 'Blood type' })
  @IsOptional()
  @IsString()
  bloodType?: string;

  @ApiPropertyOptional({
    example: ['Diabetes', 'Hypertension'],
    description: 'Array of chronic conditions',
  })
  @IsOptional()
  @IsArray()
  chronicConditions?: string[];
}

/**
 * US-12-05 – DTO for creating a care task.
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsUUID,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VALID_CATEGORIES } from '../care-tasks.schema';

export class CreateCareTaskDto {
  @ApiProperty({ example: 'a1b2c3d4-0000-0000-0000-000000000001' })
  @IsUUID()
  residentId: string;

  @ApiProperty({ example: 'Morning hygiene routine' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional({
    enum: VALID_CATEGORIES,
    example: 'personal',
    description: 'Task category (default: personal)',
  })
  @IsOptional()
  @IsIn(VALID_CATEGORIES)
  category?: string;

  @ApiPropertyOptional({
    example: '2025-05-10T08:00:00.000Z',
    description: 'Scheduled time for the task',
  })
  @IsOptional()
  @IsDateString()
  scheduledTime?: string;
}

/**
 * US-14-01 – DTO for updating an activity session.
 */

import {
  IsString,
  IsOptional,
  IsArray,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateActivityDto {
  @ApiPropertyOptional({ example: 'Updated title' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ example: '2025-05-13T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ example: 'Main Hall' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ example: ['res-1', 'res-2'] })
  @IsOptional()
  @IsArray()
  participants?: unknown[];
}

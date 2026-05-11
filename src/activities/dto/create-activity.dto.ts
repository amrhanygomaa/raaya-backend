/**
 * US-14-01 – DTO for creating an activity session.
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateActivityDto {
  @ApiProperty({ example: 'Morning Yoga Session' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional({ example: 'Gentle stretching and breathing exercises' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ example: '2025-05-12T09:00:00.000Z' })
  @IsDateString()
  startTime: string;

  @ApiPropertyOptional({ example: 'Garden Area' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({
    example: ['a1b2c3d4-0000-0000-0000-000000000001'],
    description: 'Array of participant IDs',
  })
  @IsOptional()
  @IsArray()
  participants?: unknown[];
}

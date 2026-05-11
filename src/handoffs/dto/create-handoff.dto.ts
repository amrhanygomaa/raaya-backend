/**
 * US-12-03 – DTO for creating a shift handoff.
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsArray,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VALID_SHIFT_TYPES } from '../handoffs.schema';

export class CreateHandoffDto {
  @ApiProperty({ example: 'nurse-2', description: 'Incoming nurse ID' })
  @IsString()
  @IsNotEmpty()
  incomingNurseId: string;

  @ApiProperty({
    example: '2025-05-10',
    description: 'Shift date (YYYY-MM-DD)',
  })
  @IsDateString()
  shiftDate: string;

  @ApiPropertyOptional({
    enum: VALID_SHIFT_TYPES,
    example: 'morning',
    description: 'Shift type (default: morning)',
  })
  @IsOptional()
  @IsIn(VALID_SHIFT_TYPES)
  shiftType?: string;

  @ApiProperty({
    example: 'All residents stable. Ahmad needs BP check at 14:00.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  summary: string;

  @ApiPropertyOptional({
    example: ['a1b2c3d4-0000-0000-0000-000000000001'],
    description: 'Array of resident IDs covered in this handoff',
  })
  @IsOptional()
  @IsArray()
  residentsCovered?: unknown[];

  @ApiPropertyOptional({
    example: [{ task: 'BP check for Ahmad', due: '14:00' }],
    description: 'Array of pending task objects',
  })
  @IsOptional()
  @IsArray()
  pendingTasks?: unknown[];
}

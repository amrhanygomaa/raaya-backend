/**
 * US-05-01 – DTO for updating visit status (approve / reject / complete / cancel).
 */

import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VALID_VISIT_STATUSES } from '../family-bridge.schema';

export class UpdateVisitStatusDto {
  @ApiProperty({
    enum: VALID_VISIT_STATUSES,
    example: 'approved',
    description: 'New visit status',
  })
  @IsIn(VALID_VISIT_STATUSES)
  status: string;

  @ApiPropertyOptional({ example: 'Approved by nursing staff' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

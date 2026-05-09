/**
 * US-07-03 – DTO for updating complaint status (with audit).
 */

import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VALID_STATUSES } from '../complaints.schema';

export class UpdateComplaintStatusDto {
  @ApiProperty({
    enum: VALID_STATUSES,
    example: 'in_progress',
    description: 'New complaint status',
  })
  @IsIn(VALID_STATUSES)
  status: string;

  @ApiPropertyOptional({ example: 'Issue escalated to facility manager' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  resolutionNotes?: string;
}

/**
 * US-07-03 – DTO for creating a complaint.
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VALID_CATEGORIES, VALID_PRIORITIES } from '../complaints.schema';

export class CreateComplaintDto {
  @ApiPropertyOptional({ example: 'a1b2c3d4-0000-0000-0000-000000000001' })
  @IsOptional()
  @IsUUID()
  residentId?: string;

  @ApiProperty({
    enum: VALID_CATEGORIES,
    example: 'care_quality',
    description: 'Complaint category',
  })
  @IsIn(VALID_CATEGORIES)
  category: string;

  @ApiProperty({ example: 'Physical therapy schedule concern' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  subject: string;

  @ApiPropertyOptional({ example: 'Resident missed two PT sessions last week' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({
    enum: VALID_PRIORITIES,
    example: 'high',
    description: 'Priority level (default: medium)',
  })
  @IsOptional()
  @IsIn(VALID_PRIORITIES)
  priority?: string;
}

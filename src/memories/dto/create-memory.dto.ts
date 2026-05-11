/**
 * US-14-06 – DTO for creating a memory moment.
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMemoryDto {
  @ApiProperty({ example: 'a1b2c3d4-0000-0000-0000-000000000001' })
  @IsUUID()
  residentId: string;

  @ApiProperty({ example: 'Garden Walk with Ahmad' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  activityTitle: string;

  @ApiPropertyOptional({
    example: 'garden-walk-2025.jpg',
    description: 'File name for S3 upload',
  })
  @IsOptional()
  @IsString()
  fileName?: string;
}

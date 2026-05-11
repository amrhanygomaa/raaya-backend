/**
 * US-14-04 – DTO for creating a volunteer review.
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ example: 'Staff Member Name' })
  @IsString()
  @IsNotEmpty()
  toName: string;

  @ApiPropertyOptional({ example: 'Garden Cleanup Session' })
  @IsOptional()
  @IsString()
  session?: string;

  @ApiProperty({ example: 4.5 })
  @IsNumber()
  @Min(0)
  @Max(5)
  score: number;
}

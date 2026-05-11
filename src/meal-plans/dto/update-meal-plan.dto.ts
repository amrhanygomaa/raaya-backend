/**
 * US-13-07 – DTO for updating a meal plan.
 */

import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMealPlanDto {
  @ApiPropertyOptional({ example: '2025-05-13' })
  @IsOptional()
  @IsDateString()
  planDate?: string;

  @ApiPropertyOptional({ example: 'Updated breakfast' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  breakfast?: string;

  @ApiPropertyOptional({ example: 'Updated lunch' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  lunch?: string;

  @ApiPropertyOptional({ example: 'Updated dinner' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  dinner?: string;

  @ApiPropertyOptional({ example: 'Updated instructions' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  specialInstructions?: string;
}

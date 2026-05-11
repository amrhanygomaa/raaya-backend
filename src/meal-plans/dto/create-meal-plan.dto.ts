/**
 * US-13-07 – DTO for creating a meal plan.
 */

import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMealPlanDto {
  @ApiProperty({ example: 'a1b2c3d4-0000-0000-0000-000000000001' })
  @IsUUID()
  residentId: string;

  @ApiProperty({ example: '2025-05-12' })
  @IsDateString()
  planDate: string;

  @ApiPropertyOptional({ example: 'Oatmeal with honey, fresh fruit, tea' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  breakfast?: string;

  @ApiPropertyOptional({ example: 'Grilled chicken, rice, vegetable soup' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  lunch?: string;

  @ApiPropertyOptional({ example: 'Light salad, yogurt, bread' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  dinner?: string;

  @ApiPropertyOptional({ example: 'Low sodium diet, diabetic-friendly' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  specialInstructions?: string;
}

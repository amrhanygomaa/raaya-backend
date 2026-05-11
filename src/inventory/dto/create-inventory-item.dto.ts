/**
 * US-12-07 – DTO for creating an inventory item.
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VALID_CATEGORIES } from '../inventory.schema';

export class CreateInventoryItemDto {
  @ApiProperty({ example: 'Disposable Gloves (Medium)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  name: string;

  @ApiPropertyOptional({
    enum: VALID_CATEGORIES,
    example: 'supplies',
    description: 'Item category (default: supplies)',
  })
  @IsOptional()
  @IsIn(VALID_CATEGORIES)
  category?: string;

  @ApiPropertyOptional({ example: 100, description: 'Current stock level' })
  @IsOptional()
  @IsInt()
  @Min(0)
  currentStock?: number;

  @ApiPropertyOptional({ example: 20, description: 'Minimum required stock' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minRequired?: number;

  @ApiPropertyOptional({ example: 'box', description: 'Unit of measurement' })
  @IsOptional()
  @IsString()
  unit?: string;
}

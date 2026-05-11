/**
 * US-12-07 – DTO for updating inventory stock level.
 */

import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStockDto {
  @ApiProperty({ example: 150, description: 'New stock level' })
  @IsInt()
  @Min(0)
  currentStock: number;
}

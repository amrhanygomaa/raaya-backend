/**
 * US-15-03 – DTO for creating a family bill.
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDateString,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBillDto {
  @ApiProperty({ example: 'a1b2c3d4-0000-0000-0000-000000000001' })
  @IsUUID()
  residentId: string;

  @ApiProperty({ example: 'Monthly Care Fee' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @ApiProperty({ example: '2025-05', description: 'Billing month (YYYY-MM)' })
  @IsString()
  @IsNotEmpty()
  month: string;

  @ApiProperty({ example: 5000.0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: '2025-06-01' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

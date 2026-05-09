/**
 * US-05-01 – DTO for booking a visit.
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BookVisitDto {
  @ApiProperty({ example: 'a1b2c3d4-0000-0000-0000-000000000001' })
  @IsString()
  @IsNotEmpty()
  residentId: string;

  @ApiProperty({ example: 'Khalid Al-Rashid' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  visitorName: string;

  @ApiProperty({ example: 'son' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  visitorRelationship: string;

  @ApiProperty({ example: '2025-05-12', description: 'ISO date YYYY-MM-DD' })
  @IsDateString()
  visitDate: string;

  @ApiProperty({ example: '10:00', description: 'HH:mm' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'visitTimeStart must be HH:mm' })
  visitTimeStart: string;

  @ApiProperty({ example: '11:30', description: 'HH:mm' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'visitTimeEnd must be HH:mm' })
  visitTimeEnd: string;

  @ApiPropertyOptional({ example: 'Weekly family visit' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

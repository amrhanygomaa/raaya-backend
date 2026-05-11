/**
 * US-12-01 – DTO for creating a nursing note.
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
import { VALID_CATEGORIES } from '../nursing-notes.schema';

export class CreateNursingNoteDto {
  @ApiProperty({ example: 'a1b2c3d4-0000-0000-0000-000000000001' })
  @IsUUID()
  residentId: string;

  @ApiProperty({ example: 'Routine morning check completed. Vitals normal.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;

  @ApiPropertyOptional({
    enum: VALID_CATEGORIES,
    example: 'routine',
    description: 'Note category (default: routine)',
  })
  @IsOptional()
  @IsIn(VALID_CATEGORIES)
  category?: string;
}

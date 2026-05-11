/**
 * US-12-01 – DTO for updating a nursing note.
 */

import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VALID_CATEGORIES } from '../nursing-notes.schema';

export class UpdateNursingNoteDto {
  @ApiPropertyOptional({ example: 'Updated note content after doctor review.' })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  content?: string;

  @ApiPropertyOptional({
    enum: VALID_CATEGORIES,
    example: 'concern',
    description: 'Updated note category',
  })
  @IsOptional()
  @IsIn(VALID_CATEGORIES)
  category?: string;
}

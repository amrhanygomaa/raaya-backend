/**
 * US-05-01 – DTO for confirming a media upload or rejecting it.
 */

import { IsOptional, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ConfirmMediaDto {
  @ApiPropertyOptional({ example: 245000, description: 'File size in bytes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  fileSizeBytes?: number;
}

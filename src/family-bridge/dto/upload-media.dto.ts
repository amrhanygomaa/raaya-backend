/**
 * US-05-01 – DTO for requesting a presigned S3 upload URL.
 */

import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadMediaDto {
  @ApiProperty({ example: 'a1b2c3d4-0000-0000-0000-000000000001' })
  @IsString()
  @IsNotEmpty()
  residentId: string;

  @ApiProperty({ example: 'family-photo.jpg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  fileName: string;

  @ApiProperty({ example: 'image/jpeg', description: 'MIME type of the file' })
  @IsString()
  @IsNotEmpty()
  contentType: string;

  @ApiPropertyOptional({ example: 'Family gathering – Eid 2025' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  caption?: string;
}

/**
 * US-14-03 – DTO for updating volunteer profile.
 */

import { IsString, IsOptional, IsArray, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVolunteerProfileDto {
  @ApiPropertyOptional({ example: 'Ahmad Volunteer' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'Passionate about elderly care' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({ example: 'Riyadh, KSA' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: ['First Aid', 'Music Therapy'] })
  @IsOptional()
  @IsArray()
  skills?: string[];

  @ApiPropertyOptional({
    example: { linkedin: 'https://linkedin.com/in/ahmad' },
  })
  @IsOptional()
  socialLinks?: Record<string, string>;

  @ApiPropertyOptional({ example: 'https://s3.amazonaws.com/...' })
  @IsOptional()
  @IsString()
  cvFileUrl?: string;
}

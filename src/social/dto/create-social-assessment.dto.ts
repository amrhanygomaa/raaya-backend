import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSocialAssessmentDto {
  @ApiProperty({ example: '00000000-0000-0000-0000-000000000001' })
  @IsUUID()
  residentId: string;

  @ApiProperty({ example: { نفسي: 0.8, أسري: 0.6 } })
  @IsObject()
  scores: Record<string, number>;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  needsIntervention?: boolean;

  @ApiPropertyOptional({ example: 'Needs weekly follow-up' })
  @IsOptional()
  @IsString()
  notes?: string;
}

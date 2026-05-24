import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RequestAiMediaDto {
  @ApiProperty({ example: 'medication-label.jpg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  contentType: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-0000-0000-0000-000000000001' })
  @IsOptional()
  @IsString()
  residentId?: string;
}

export class ConfirmAiMediaDto {
  @ApiPropertyOptional({
    example: 'AI companion media upload',
    description: 'Optional free-form notes to attach to the record.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

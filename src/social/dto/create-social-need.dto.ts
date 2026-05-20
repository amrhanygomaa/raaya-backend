import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSocialNeedDto {
  @ApiProperty({ example: 'نفسي' })
  @IsString()
  type: string;

  @ApiProperty({ example: '101' })
  @IsString()
  roomNumber: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;

  @ApiProperty({ example: 'ن' })
  @IsString()
  label: string;
}

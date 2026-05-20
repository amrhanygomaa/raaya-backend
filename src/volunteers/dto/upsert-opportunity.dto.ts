import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertOpportunityDto {
  @ApiProperty({ example: 'Music afternoon with residents' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Raaya Care Home' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  org?: string;

  @ApiPropertyOptional({ example: 'Tomorrow 04:00 PM' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  dateInfo?: string;

  @ApiPropertyOptional({ example: ['music', 'social'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  hours?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  points?: number;

  @ApiPropertyOptional({ example: 'Help residents enjoy a social activity.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalSlots?: number;
}

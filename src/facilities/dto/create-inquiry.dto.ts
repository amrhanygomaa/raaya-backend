import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInquiryDto {
  @ApiProperty({ example: 'أحمد محمود' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: '+201112223334' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  phone: string;

  @ApiProperty({ example: 'القاهرة' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  governorate: string;

  @ApiProperty({ example: 'مدينة نصر' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['حديقة واسعة', 'علاج طبيعي'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(40)
  features?: string[];

  @ApiPropertyOptional({ example: 'facility-demo' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  facilityId?: string;
}

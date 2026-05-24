import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchFacilitiesDto {
  @ApiProperty({ example: 'القاهرة' })
  @IsString()
  @IsNotEmpty()
  governorate: string;

  @ApiProperty({ example: 'مدينة نصر' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional({
    example: 'حديقة واسعة,علاج طبيعي',
    description: 'Comma-separated list of features the user is filtering by.',
  })
  @IsOptional()
  @IsString()
  features?: string;
}

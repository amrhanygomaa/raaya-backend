import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 'مرحباً، كيف حال والدك اليوم؟' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body: string;

  @ApiProperty({
    example: 'specialist-user-id',
    description: 'Cognito sub of recipient',
  })
  @IsString()
  @IsNotEmpty()
  recipientId: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-0000-0000-0000-000000000001' })
  @IsOptional()
  @IsUUID()
  residentId?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/media/photo.jpg',
    description: 'Public URL of an attached file (image, document, etc.)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  mediaUrl?: string;

  @ApiPropertyOptional({
    example: 'image/jpeg',
    description: 'MIME type or short label (image, file, audio…) of the attachment',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  mediaType?: string;
}

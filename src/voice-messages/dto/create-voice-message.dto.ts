/**
 * US-15-01 – DTO for creating a voice message.
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsUUID,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VALID_SENDER_TYPES } from '../voice-messages.schema';

export class CreateVoiceMessageDto {
  @ApiProperty({ example: 'a1b2c3d4-0000-0000-0000-000000000001' })
  @IsUUID()
  residentId: string;

  @ApiProperty({ enum: VALID_SENDER_TYPES, example: 'family' })
  @IsIn(VALID_SENDER_TYPES)
  senderType: string;

  @ApiProperty({ example: 'Good morning message from Khalid' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional({
    example: 'morning-msg-khalid.mp3',
    description: 'File name for S3 upload',
  })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ example: 45, description: 'Duration in seconds' })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;
}

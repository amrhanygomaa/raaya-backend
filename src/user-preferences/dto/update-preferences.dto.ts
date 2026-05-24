import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePreferencesDto {
  @ApiProperty({
    example: { language: 'ar', notifications: { medication: true } },
    description: 'Arbitrary JSON object. Replaces the stored preferences.',
  })
  @IsObject()
  preferences: Record<string, unknown>;
}

import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const CALL_PROVIDERS = ['zoom', 'agora', 'jitsi'] as const;
export const CALL_TYPES = [
  'family_video',
  'medical_consult',
  'volunteer_visit',
] as const;

export class CreateVideoCallDto {
  @ApiPropertyOptional({ example: 'a1b2c3d4-0000-0000-0000-000000000001' })
  @IsOptional()
  @IsString()
  residentId?: string;

  @ApiPropertyOptional({ example: 'user-uuid-of-callee' })
  @IsOptional()
  @IsString()
  calleeId?: string;

  @ApiPropertyOptional({ example: 'سارة الراشد' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  calleeName?: string;

  @ApiProperty({ enum: CALL_TYPES, example: 'family_video' })
  @IsIn(CALL_TYPES)
  callType: (typeof CALL_TYPES)[number];

  @ApiPropertyOptional({ enum: CALL_PROVIDERS, default: 'zoom' })
  @IsOptional()
  @IsIn(CALL_PROVIDERS)
  provider?: (typeof CALL_PROVIDERS)[number];

  @ApiPropertyOptional({ example: 'https://zoom.us/j/123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  joinUrl?: string;
}

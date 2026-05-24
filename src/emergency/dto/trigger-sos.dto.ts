import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class TriggerSosDto {
  @ApiProperty({
    example: 'user-cognito-sub-uuid',
    description: 'Cognito sub of the user triggering SOS',
  })
  @IsString()
  triggeredBy: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-0000-0000-0000-000000000001' })
  @IsOptional()
  @IsUUID()
  residentId?: string;

  @ApiPropertyOptional({
    example: 'الغرفة 12',
    description: 'Location description',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 'سقوط مفاجئ' })
  @IsOptional()
  @IsString()
  notes?: string;
}

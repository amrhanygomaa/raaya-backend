import {
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
  IsString,
  MaxLength,
  IsObject,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VitalThresholdSetting } from '../admin-management.schema';

export class UpdateFacilitySettingsDto {
  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  medicationReminderMinutesBefore?: number;

  @ApiPropertyOptional({ example: 24 })
  @IsOptional()
  @IsInt()
  @Min(0)
  visitReminderHoursBefore?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  alertPushEnabled?: boolean;

  @ApiPropertyOptional({ example: 'Asia/Riyadh' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @ApiPropertyOptional({
    example: {
      heart_rate: { minValue: 60, maxValue: 100, unit: 'bpm' },
      oxygen_saturation: { minValue: 95, unit: '%' },
    },
  })
  @IsOptional()
  @IsObject()
  vitalThresholds?: Record<string, VitalThresholdSetting>;
}

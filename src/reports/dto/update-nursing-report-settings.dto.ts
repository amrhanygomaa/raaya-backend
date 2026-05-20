import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateNursingReportSettingsDto {
  @IsOptional()
  @IsString()
  dailyTime?: string;

  @IsOptional()
  @IsString()
  weeklyDay?: string;

  @IsOptional()
  @IsBoolean()
  criticalAlertEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  missedMedicationAlertEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipients?: string[];
}

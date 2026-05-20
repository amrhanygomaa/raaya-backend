import { IsArray, IsOptional, IsString } from 'class-validator';

export class SendNursingReportDto {
  @IsString()
  reportType: string;

  @IsArray()
  @IsString({ each: true })
  recipients: string[];

  @IsOptional()
  metadata?: Record<string, unknown>;
}

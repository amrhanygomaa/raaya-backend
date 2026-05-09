/**
 * US-03-02 – DTO for patching (partially updating) a resident.
 *
 * Every field is optional.  facilityId and id are never accepted from body.
 */

import {
  IsString,
  IsOptional,
  IsIn,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VALID_GENDERS, VALID_STATUSES } from '../residents.schema';

export class UpdateResidentDto {
  @ApiPropertyOptional({ example: 'Ahmad' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Al-Rashid' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: '1940-03-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: VALID_GENDERS, example: 'male' })
  @IsOptional()
  @IsIn(VALID_GENDERS)
  gender?: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  nationalId?: string;

  @ApiPropertyOptional({ example: '101' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  roomNumber?: string;

  @ApiPropertyOptional({ example: '2025-01-10' })
  @IsOptional()
  @IsDateString()
  admissionDate?: string;

  @ApiPropertyOptional({ example: '2025-06-01' })
  @IsOptional()
  @IsDateString()
  dischargeDate?: string;

  @ApiPropertyOptional({ enum: VALID_STATUSES, example: 'active' })
  @IsOptional()
  @IsIn(VALID_STATUSES)
  status?: string;

  @ApiPropertyOptional({ example: 'Needs wheelchair assistance' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

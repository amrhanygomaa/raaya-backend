/**
 * US-03-02 – DTO for creating a new resident.
 *
 * facilityId is NOT accepted from the body – it is injected from the
 * authenticated user's JWT token to enforce facility scoping.
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VALID_GENDERS, VALID_STATUSES } from '../residents.schema';

export class CreateResidentDto {
  @ApiProperty({ example: 'Ahmad' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Al-Rashid' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: '1940-03-15', description: 'ISO date YYYY-MM-DD' })
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({ enum: VALID_GENDERS, example: 'male' })
  @IsIn(VALID_GENDERS)
  gender: string;

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

  @ApiProperty({
    example: '2025-01-10',
    description: 'ISO date YYYY-MM-DD',
  })
  @IsDateString()
  admissionDate: string;

  @ApiPropertyOptional({
    example: '2025-06-01',
    description: 'ISO date YYYY-MM-DD',
  })
  @IsOptional()
  @IsDateString()
  dischargeDate?: string;

  @ApiPropertyOptional({
    enum: VALID_STATUSES,
    default: 'active',
    example: 'active',
  })
  @IsOptional()
  @IsIn(VALID_STATUSES)
  status?: string;

  @ApiPropertyOptional({ example: 'Needs wheelchair assistance' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

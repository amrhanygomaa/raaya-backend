import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsIn,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VALID_MANAGED_USER_ROLES } from '../admin-management.schema';

export class CreateManagedUserDto {
  @ApiProperty({ example: 'nurse@raaya.demo' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Demo Nurse' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fullName: string;

  @ApiProperty({ enum: VALID_MANAGED_USER_ROLES, example: 'Nurse' })
  @IsIn(VALID_MANAGED_USER_ROLES)
  role: string;

  @ApiPropertyOptional({ example: 'TempPass123!', minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  temporaryPassword?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  suppressInvite?: boolean;
}

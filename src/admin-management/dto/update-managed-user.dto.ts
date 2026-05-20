import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VALID_MANAGED_USER_ROLES } from '../admin-management.schema';

export class UpdateManagedUserDto {
  @ApiPropertyOptional({ example: 'Nurse Name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fullName?: string;

  @ApiPropertyOptional({ enum: VALID_MANAGED_USER_ROLES, example: 'Nurse' })
  @IsOptional()
  @IsIn(VALID_MANAGED_USER_ROLES)
  role?: string;
}

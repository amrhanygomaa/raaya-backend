import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddPointsDto {
  @ApiProperty({ example: 10, description: 'Points to add (can be negative).' })
  @IsInt()
  points: number;

  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: 'Increment to completed_activities.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  completedActivitiesDelta?: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'Replace streak_days (e.g. when the client computes it).',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  streakDays?: number;
}

/**
 * US-14-03 – DTO for creating a volunteer booking.
 */

import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ example: '00000000-0000-0000-0000-000000000001' })
  @IsUUID()
  opportunityId: string;
}

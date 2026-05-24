import { Body, Controller, Get, Ip, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FacilitiesService } from './facilities.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';

@ApiTags('Facilities (Public)')
@Controller()
export class FacilitiesController {
  constructor(private readonly service: FacilitiesService) {}

  @Get('facilities/search')
  @ApiOperation({
    summary: 'Public search for facilities by governorate / city / features',
    description:
      'No authentication required. Used by the login screen to let prospective family/volunteer ' +
      'users browse facilities before they sign up.',
  })
  @ApiQuery({ name: 'governorate', required: true, example: 'القاهرة' })
  @ApiQuery({ name: 'city', required: true, example: 'مدينة نصر' })
  @ApiQuery({
    name: 'features',
    required: false,
    description: 'Comma-separated feature labels',
    example: 'حديقة واسعة,علاج طبيعي',
  })
  @ApiResponse({ status: 200, description: 'Array of matching facilities.' })
  async search(
    @Query('governorate') governorate: string,
    @Query('city') city: string,
    @Query('features') features?: string,
  ) {
    const featureList = (features ?? '')
      .split(',')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);
    return this.service.search(governorate ?? '', city ?? '', featureList);
  }

  @Post('facility-inquiries')
  @ApiOperation({
    summary: 'Public submit an inquiry form (lead capture)',
    description:
      'No authentication required. Records the inquiry for the admin team to follow up by phone.',
  })
  @ApiResponse({ status: 201, description: 'Inquiry stored.' })
  async createInquiry(@Body() dto: CreateInquiryDto, @Ip() ip: string) {
    return this.service.createInquiry(dto, ip ?? null);
  }
}

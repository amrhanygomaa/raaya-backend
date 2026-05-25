import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FamilyMembersService } from './family-members.service';
import { CreateFamilyMemberDto } from './dto/create-family-member.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('Family Members')
@ApiBearerAuth()
@Controller('family-members')
@UseGuards(AuthGuard('jwt'))
export class FamilyMembersController {
  constructor(private readonly service: FamilyMembersService) {}

  @Get('me')
  @ApiOperation({ summary: 'List family member links for current user email' })
  @ApiResponse({ status: 200, description: 'Array of linked family records.' })
  async findMine(@Request() req: AuthenticatedRequest) {
    return this.service.findByEmail(req.user.facilityId, req.user.email);
  }

  @Get()
  @ApiOperation({ summary: 'List family members for a resident' })
  @ApiQuery({ name: 'residentId', required: true })
  @ApiResponse({ status: 200, description: 'Array of family members.' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('residentId') residentId: string,
  ) {
    return this.service.findByResident(req.user.facilityId, residentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one family member by ID' })
  @ApiParam({ name: 'id' })
  async findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.findOne(req.user.facilityId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a family member for a resident' })
  @ApiResponse({ status: 201, description: 'Family member created.' })
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateFamilyMemberDto,
  ) {
    return this.service.create(req.user.facilityId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a family member' })
  @ApiParam({ name: 'id' })
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: Partial<CreateFamilyMemberDto>,
  ) {
    return this.service.update(req.user.facilityId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a family member' })
  @ApiParam({ name: 'id' })
  async delete(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.delete(req.user.facilityId, id);
  }
}

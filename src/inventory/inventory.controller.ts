/**
 * US-12-07 – InventoryController
 *
 * Endpoints:
 *   POST   /inventory             → Add item
 *   GET    /inventory             → List items (filterable by category)
 *   PATCH  /inventory/:id/stock   → Update stock level
 *   GET    /inventory/low-stock   → Items below threshold
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Add an inventory item' })
  @ApiResponse({ status: 201, description: 'Inventory item created.' })
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateInventoryItemDto,
  ) {
    return this.inventoryService.create(req.user.facilityId, dto);
  }

  @Get('low-stock')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get items below minimum stock threshold' })
  @ApiResponse({ status: 200, description: 'Array of low-stock items.' })
  async getLowStock(@Request() req: AuthenticatedRequest) {
    return this.inventoryService.getLowStock(req.user.facilityId);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List inventory items' })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ['medications', 'personal', 'supplies'],
  })
  @ApiResponse({ status: 200, description: 'Array of inventory items.' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('category') category?: string,
  ) {
    return this.inventoryService.findAll(req.user.facilityId, { category });
  }

  @Patch(':id/stock')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update stock level for an inventory item' })
  @ApiParam({ name: 'id', description: 'Inventory item UUID' })
  @ApiResponse({ status: 200, description: 'Updated inventory item.' })
  @ApiResponse({ status: 404, description: 'Item not found.' })
  async updateStock(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateStockDto,
  ) {
    return this.inventoryService.updateStock(req.user.facilityId, id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete an inventory item' })
  @ApiParam({ name: 'id', description: 'Inventory item UUID' })
  @ApiResponse({ status: 200, description: 'Inventory item deleted.' })
  @ApiResponse({ status: 404, description: 'Item not found.' })
  async delete(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.inventoryService.delete(req.user.facilityId, id);
  }
}

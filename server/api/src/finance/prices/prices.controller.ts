import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../auth/guards/roles.guard';
import { Role } from '@prisma/client';
import { PricesService } from './prices.service';
import { CreatePriceDto, UpdatePriceDto, PriceResponseDto } from './dto';

@ApiTags('Prices')
@Controller('admin/finance/prices')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PricesController {
  constructor(private readonly pricesService: PricesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new price' })
  @ApiResponse({ status: 201, description: 'Price created successfully', type: PriceResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createPrice(@Body() createPriceDto: CreatePriceDto): Promise<PriceResponseDto> {
    return this.pricesService.create(createPriceDto);
  }

  @Post(':id/activate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Activate a price version' })
  @ApiResponse({ status: 200, description: 'Price activated successfully', type: PriceResponseDto })
  @ApiResponse({ status: 404, description: 'Price not found' })
  async activatePrice(@Param('id') id: string): Promise<PriceResponseDto> {
    return this.pricesService.activate(id);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all prices with pagination' })
  @ApiResponse({ status: 200, description: 'Prices retrieved successfully' })
  async getAllPrices(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('variantId') variantId?: string,
    @Query('type') type?: string,
    @Query('currency') currency?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.pricesService.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      variantId,
      type,
      currency,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get price by ID' })
  @ApiResponse({ status: 200, description: 'Price retrieved successfully', type: PriceResponseDto })
  @ApiResponse({ status: 404, description: 'Price not found' })
  async getPriceById(@Param('id') id: string): Promise<PriceResponseDto> {
    return this.pricesService.findById(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update price' })
  @ApiResponse({ status: 200, description: 'Price updated successfully', type: PriceResponseDto })
  @ApiResponse({ status: 404, description: 'Price not found' })
  async updatePrice(
    @Param('id') id: string,
    @Body() updatePriceDto: UpdatePriceDto,
  ): Promise<PriceResponseDto> {
    return this.pricesService.update(id, updatePriceDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete price' })
  @ApiResponse({ status: 204, description: 'Price deleted successfully' })
  @ApiResponse({ status: 404, description: 'Price not found' })
  async deletePrice(@Param('id') id: string): Promise<void> {
    return this.pricesService.delete(id);
  }
}

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
import { CostsService } from './costs.service';
import { CreateCostDto, UpdateCostDto, CostResponseDto } from './dto';

@ApiTags('Costs')
@Controller('admin/finance/costs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CostsController {
  constructor(private readonly costsService: CostsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new cost' })
  @ApiResponse({ status: 201, description: 'Cost created successfully', type: CostResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createCost(@Body() createCostDto: CreateCostDto): Promise<CostResponseDto> {
    return this.costsService.create(createCostDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all costs with pagination' })
  @ApiResponse({ status: 200, description: 'Costs retrieved successfully' })
  async getAllCosts(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('variantId') variantId?: string,
    @Query('type') type?: string,
    @Query('currency') currency?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.costsService.findAll({
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
  @ApiOperation({ summary: 'Get cost by ID' })
  @ApiResponse({ status: 200, description: 'Cost retrieved successfully', type: CostResponseDto })
  @ApiResponse({ status: 404, description: 'Cost not found' })
  async getCostById(@Param('id') id: string): Promise<CostResponseDto> {
    return this.costsService.findById(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update cost' })
  @ApiResponse({ status: 200, description: 'Cost updated successfully', type: CostResponseDto })
  @ApiResponse({ status: 404, description: 'Cost not found' })
  async updateCost(
    @Param('id') id: string,
    @Body() updateCostDto: UpdateCostDto,
  ): Promise<CostResponseDto> {
    return this.costsService.update(id, updateCostDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete cost' })
  @ApiResponse({ status: 204, description: 'Cost deleted successfully' })
  @ApiResponse({ status: 404, description: 'Cost not found' })
  async deleteCost(@Param('id') id: string): Promise<void> {
    return this.costsService.delete(id);
  }
}

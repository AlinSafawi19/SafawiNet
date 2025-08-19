import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../auth/guards/roles.guard';
import { Role } from '@prisma/client';
import { TaxRatesService } from './tax-rates.service';
import { CreateTaxRateDto, UpdateTaxRateDto, TaxRateResponseDto } from './dto';

@ApiTags('Tax Rates')
@Controller('admin/finance/tax-rates')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TaxRatesController {
  constructor(private readonly taxRatesService: TaxRatesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new tax rate' })
  @ApiResponse({ status: 201, description: 'Tax rate created successfully', type: TaxRateResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Tax category not found' })
  create(@Body() createTaxRateDto: CreateTaxRateDto) {
    return this.taxRatesService.create(createTaxRateDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all tax rates with pagination' })
  @ApiResponse({ status: 200, description: 'Tax rates retrieved successfully', type: [TaxRateResponseDto] })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('taxCategoryId') taxCategoryId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.taxRatesService.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      taxCategoryId,
      isActive: isActive ? isActive === 'true' : undefined,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get a tax rate by ID' })
  @ApiResponse({ status: 200, description: 'Tax rate retrieved successfully', type: TaxRateResponseDto })
  @ApiResponse({ status: 404, description: 'Tax rate not found' })
  findOne(@Param('id') id: string) {
    return this.taxRatesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a tax rate' })
  @ApiResponse({ status: 200, description: 'Tax rate updated successfully', type: TaxRateResponseDto })
  @ApiResponse({ status: 404, description: 'Tax rate not found' })
  update(@Param('id') id: string, @Body() updateTaxRateDto: UpdateTaxRateDto) {
    return this.taxRatesService.update(id, updateTaxRateDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a tax rate' })
  @ApiResponse({ status: 200, description: 'Tax rate deleted successfully' })
  @ApiResponse({ status: 404, description: 'Tax rate not found' })
  remove(@Param('id') id: string) {
    return this.taxRatesService.remove(id);
  }
}

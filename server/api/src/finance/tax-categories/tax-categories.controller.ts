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
import { TaxCategoriesService } from './tax-categories.service';
import { CreateTaxCategoryDto, UpdateTaxCategoryDto, TaxCategoryResponseDto } from './dto';

@ApiTags('Tax Categories')
@Controller('admin/finance/tax-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TaxCategoriesController {
  constructor(private readonly taxCategoriesService: TaxCategoriesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new tax category' })
  @ApiResponse({ status: 201, description: 'Tax category created successfully', type: TaxCategoryResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(@Body() createTaxCategoryDto: CreateTaxCategoryDto) {
    return this.taxCategoriesService.create(createTaxCategoryDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all tax categories with pagination' })
  @ApiResponse({ status: 200, description: 'Tax categories retrieved successfully', type: [TaxCategoryResponseDto] })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.taxCategoriesService.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      isActive: isActive ? isActive === 'true' : undefined,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get a tax category by ID' })
  @ApiResponse({ status: 200, description: 'Tax category retrieved successfully', type: TaxCategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Tax category not found' })
  findOne(@Param('id') id: string) {
    return this.taxCategoriesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a tax category' })
  @ApiResponse({ status: 200, description: 'Tax category updated successfully', type: TaxCategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Tax category not found' })
  update(@Param('id') id: string, @Body() updateTaxCategoryDto: UpdateTaxCategoryDto) {
    return this.taxCategoriesService.update(id, updateTaxCategoryDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a tax category' })
  @ApiResponse({ status: 200, description: 'Tax category deleted successfully' })
  @ApiResponse({ status: 404, description: 'Tax category not found' })
  remove(@Param('id') id: string) {
    return this.taxCategoriesService.remove(id);
  }
}

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
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { CreateChartOfAccountDto, UpdateChartOfAccountDto, ChartOfAccountResponseDto } from './dto';

@ApiTags('Chart of Accounts')
@Controller('admin/finance/chart-of-accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ChartOfAccountsController {
  constructor(private readonly chartOfAccountsService: ChartOfAccountsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new chart of account' })
  @ApiResponse({ status: 201, description: 'Chart of account created successfully', type: ChartOfAccountResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Account code already exists' })
  create(@Body() createChartOfAccountDto: CreateChartOfAccountDto) {
    return this.chartOfAccountsService.create(createChartOfAccountDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all chart of accounts with pagination' })
  @ApiResponse({ status: 200, description: 'Chart of accounts retrieved successfully', type: [ChartOfAccountResponseDto] })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.chartOfAccountsService.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      type,
      isActive: isActive ? isActive === 'true' : undefined,
    });
  }

  @Get('tree')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get chart of accounts as a hierarchical tree' })
  @ApiResponse({ status: 200, description: 'Chart of accounts tree retrieved successfully' })
  getTree() {
    return this.chartOfAccountsService.getTree();
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get a chart of account by ID' })
  @ApiResponse({ status: 200, description: 'Chart of account retrieved successfully', type: ChartOfAccountResponseDto })
  @ApiResponse({ status: 404, description: 'Chart of account not found' })
  findOne(@Param('id') id: string) {
    return this.chartOfAccountsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a chart of account' })
  @ApiResponse({ status: 200, description: 'Chart of account updated successfully', type: ChartOfAccountResponseDto })
  @ApiResponse({ status: 404, description: 'Chart of account not found' })
  @ApiResponse({ status: 409, description: 'Account code already exists' })
  update(@Param('id') id: string, @Body() updateChartOfAccountDto: UpdateChartOfAccountDto) {
    return this.chartOfAccountsService.update(id, updateChartOfAccountDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a chart of account' })
  @ApiResponse({ status: 200, description: 'Chart of account deleted successfully' })
  @ApiResponse({ status: 404, description: 'Chart of account not found' })
  remove(@Param('id') id: string) {
    return this.chartOfAccountsService.remove(id);
  }
}

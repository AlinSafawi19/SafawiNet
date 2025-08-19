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
import { MediaService } from './media.service';
import { CreateMediaDto, UpdateMediaDto, MediaResponseDto } from './dto';

@ApiTags('Product Media')
@Controller('admin/catalog/media')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new media item' })
  @ApiResponse({ status: 201, description: 'Media created successfully', type: MediaResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createMedia(@Body() createMediaDto: CreateMediaDto): Promise<MediaResponseDto> {
    return this.mediaService.create(createMediaDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all media with pagination' })
  @ApiResponse({ status: 200, description: 'Media retrieved successfully' })
  async getAllMedia(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('productId') productId?: string,
    @Query('variantId') variantId?: string,
    @Query('type') type?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.mediaService.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      productId,
      variantId,
      type,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get media by ID' })
  @ApiResponse({ status: 200, description: 'Media retrieved successfully', type: MediaResponseDto })
  @ApiResponse({ status: 404, description: 'Media not found' })
  async getMediaById(@Param('id') id: string): Promise<MediaResponseDto> {
    return this.mediaService.findById(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update media' })
  @ApiResponse({ status: 200, description: 'Media updated successfully', type: MediaResponseDto })
  @ApiResponse({ status: 404, description: 'Media not found' })
  async updateMedia(
    @Param('id') id: string,
    @Body() updateMediaDto: UpdateMediaDto,
  ): Promise<MediaResponseDto> {
    return this.mediaService.update(id, updateMediaDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete media' })
  @ApiResponse({ status: 204, description: 'Media deleted successfully' })
  @ApiResponse({ status: 404, description: 'Media not found' })
  async deleteMedia(@Param('id') id: string): Promise<void> {
    return this.mediaService.delete(id);
  }
}

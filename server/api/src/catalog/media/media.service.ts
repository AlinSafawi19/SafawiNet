import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { CreateMediaDto, UpdateMediaDto, MediaResponseDto } from './dto';

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createMediaDto: CreateMediaDto): Promise<MediaResponseDto> {
    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: createMediaDto.productId },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // If variantId is provided, verify it exists and belongs to the product
    if (createMediaDto.variantId) {
      const variant = await this.prisma.productVariant.findFirst({
        where: {
          id: createMediaDto.variantId,
          productId: createMediaDto.productId,
        },
      });

      if (!variant) {
        throw new BadRequestException('Variant not found or does not belong to the specified product');
      }
    }

    const media = await this.prisma.productMedia.create({
      data: createMediaDto,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        variant: {
          select: {
            id: true,
            sku: true,
            name: true,
          },
        },
      },
    });

    return this.mapToResponseDto(media);
  }

  async findAll(params: {
    page: number;
    limit: number;
    productId?: string;
    variantId?: string;
    type?: string;
    isActive?: boolean;
  }): Promise<{
    data: MediaResponseDto[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { page, limit, productId, variantId, type, isActive } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (productId) {
      where.productId = productId;
    }

    if (variantId) {
      where.variantId = variantId;
    }

    if (type) {
      where.type = type;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [media, total] = await Promise.all([
      this.prisma.productMedia.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          variant: {
            select: {
              id: true,
              sku: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.productMedia.count({ where }),
    ]);

    return {
      data: media.map(mediaItem => this.mapToResponseDto(mediaItem)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<MediaResponseDto> {
    const media = await this.prisma.productMedia.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        variant: {
          select: {
            id: true,
            sku: true,
            name: true,
          },
        },
      },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    return this.mapToResponseDto(media);
  }

  async update(id: string, updateMediaDto: UpdateMediaDto): Promise<MediaResponseDto> {
    // Check if media exists
    const existingMedia = await this.prisma.productMedia.findUnique({
      where: { id },
    });

    if (!existingMedia) {
      throw new NotFoundException('Media not found');
    }

    const media = await this.prisma.productMedia.update({
      where: { id },
      data: updateMediaDto,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        variant: {
          select: {
            id: true,
            sku: true,
            name: true,
          },
        },
      },
    });

    return this.mapToResponseDto(media);
  }

  async delete(id: string): Promise<void> {
    // Check if media exists
    const media = await this.prisma.productMedia.findUnique({
      where: { id },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    await this.prisma.productMedia.delete({
      where: { id },
    });
  }

  private mapToResponseDto(media: any): MediaResponseDto {
    return {
      id: media.id,
      productId: media.productId,
      variantId: media.variantId,
      url: media.url,
      altText: media.altText,
      type: media.type,
      sortOrder: media.sortOrder,
      isActive: media.isActive,
      metadata: media.metadata,
      createdAt: media.createdAt,
      updatedAt: media.updatedAt,
      product: media.product,
      variant: media.variant,
    };
  }
}

import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto, CategoryResponseDto } from './dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
    // Check if slug already exists
    const existingCategory = await this.prisma.category.findUnique({
      where: { slug: createCategoryDto.slug },
    });

    if (existingCategory) {
      throw new ConflictException('Category with this slug already exists');
    }

    // If parentId is provided, verify it exists
    if (createCategoryDto.parentId) {
      const parentCategory = await this.prisma.category.findUnique({
        where: { id: createCategoryDto.parentId },
      });

      if (!parentCategory) {
        throw new BadRequestException('Parent category not found');
      }
    }

    const category = await this.prisma.category.create({
      data: createCategoryDto,
      include: {
        parent: true,
        children: true,
      },
    });

    return this.mapToResponseDto(category);
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    parentId?: string;
  }): Promise<{
    data: CategoryResponseDto[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { page, limit, search, parentId } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (parentId) {
      where.parentId = parentId;
    }

    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          parent: true,
          children: true,
          _count: {
            select: {
              children: true,
              products: true,
            },
          },
        },
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      data: categories.map(category => this.mapToResponseDto(category)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<CategoryResponseDto> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        _count: {
          select: {
            children: true,
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.mapToResponseDto(category);
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    // Check if category exists
    const existingCategory = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      throw new NotFoundException('Category not found');
    }

    // If slug is being updated, check for conflicts
    if (updateCategoryDto.slug && updateCategoryDto.slug !== existingCategory.slug) {
      const slugConflict = await this.prisma.category.findUnique({
        where: { slug: updateCategoryDto.slug },
      });

      if (slugConflict) {
        throw new ConflictException('Category with this slug already exists');
      }
    }

    // If parentId is being updated, verify it exists and prevent circular references
    if (updateCategoryDto.parentId) {
      if (updateCategoryDto.parentId === id) {
        throw new BadRequestException('Category cannot be its own parent');
      }

      const parentCategory = await this.prisma.category.findUnique({
        where: { id: updateCategoryDto.parentId },
      });

      if (!parentCategory) {
        throw new BadRequestException('Parent category not found');
      }

      // Check for circular reference (parent cannot be a descendant)
      const isDescendant = await this.isDescendant(updateCategoryDto.parentId, id);
      if (isDescendant) {
        throw new BadRequestException('Cannot set parent to a descendant category');
      }
    }

    const category = await this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
      include: {
        parent: true,
        children: true,
      },
    });

    return this.mapToResponseDto(category);
  }

  async delete(id: string): Promise<void> {
    // Check if category exists
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            children: true,
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check if category has children or products
    if (category._count.children > 0) {
      throw new BadRequestException('Cannot delete category with child categories');
    }

    if (category._count.products > 0) {
      throw new BadRequestException('Cannot delete category with associated products');
    }

    await this.prisma.category.delete({
      where: { id },
    });
  }

  async getCategoryTree(): Promise<CategoryResponseDto[]> {
    const categories = await this.prisma.category.findMany({
      where: { parentId: null }, // Get only root categories
      include: {
        children: {
          include: {
            children: true,
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return categories.map(category => this.mapToResponseDto(category));
  }

  private async isDescendant(potentialParentId: string, categoryId: string): Promise<boolean> {
    const children = await this.prisma.category.findMany({
      where: { parentId: potentialParentId },
      select: { id: true },
    });

    for (const child of children) {
      if (child.id === categoryId) {
        return true;
      }

      const isDescendant = await this.isDescendant(child.id, categoryId);
      if (isDescendant) {
        return true;
      }
    }

    return false;
  }

  private mapToResponseDto(category: any): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      parentId: category.parentId,
      imageUrl: category.imageUrl,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      parent: category.parent ? this.mapToResponseDto(category.parent) : undefined,
      children: category.children ? category.children.map((child: any) => this.mapToResponseDto(child)) : undefined,
    };
  }
}

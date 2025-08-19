import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const updateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').optional(),
  slug: z.string().min(1, 'Slug is required').max(100, 'Slug must be less than 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens').optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  parentId: z.string().cuid().optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export class UpdateCategoryDto extends createZodDto(updateCategorySchema) {
  @ApiProperty({ description: 'Category name', example: 'Red Wines', required: false })
  name?: string;

  @ApiProperty({ description: 'Category slug', example: 'red-wines', required: false })
  slug?: string;

  @ApiProperty({ description: 'Category description', example: 'Premium red wines from around the world', required: false })
  description?: string;

  @ApiProperty({ description: 'Parent category ID', required: false })
  parentId?: string;

  @ApiProperty({ description: 'Category image URL', required: false })
  imageUrl?: string;

  @ApiProperty({ description: 'Whether the category is active', required: false })
  isActive?: boolean;

  @ApiProperty({ description: 'Sort order for display', required: false })
  sortOrder?: number;
}

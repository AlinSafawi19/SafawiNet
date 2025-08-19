import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  slug: z.string().min(1, 'Slug is required').max(100, 'Slug must be less than 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  parentId: z.string().cuid().optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export class CreateCategoryDto extends createZodDto(createCategorySchema) {
  @ApiProperty({ description: 'Category name', example: 'Red Wines' })
  name!: string;

  @ApiProperty({ description: 'Category slug', example: 'red-wines' })
  slug!: string;

  @ApiProperty({ description: 'Category description', example: 'Premium red wines from around the world', required: false })
  description?: string;

  @ApiProperty({ description: 'Parent category ID', required: false })
  parentId?: string;

  @ApiProperty({ description: 'Category image URL', required: false })
  imageUrl?: string;

  @ApiProperty({ description: 'Whether the category is active', default: true })
  isActive!: boolean;

  @ApiProperty({ description: 'Sort order for display', default: 0 })
  sortOrder!: number;
}

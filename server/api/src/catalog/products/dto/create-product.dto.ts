import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be less than 200 characters'),
  slug: z.string().min(1, 'Slug is required').max(200, 'Slug must be less than 200 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  categoryId: z.string().cuid('Invalid category ID'),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
  metadata: z.record(z.string(), z.any()).optional(),
});

export class CreateProductDto extends createZodDto(createProductSchema) {
  @ApiProperty({ description: 'Product name', example: 'Château Margaux 2015' })
  name!: string;

  @ApiProperty({ description: 'Product slug', example: 'chateau-margaux-2015' })
  slug!: string;

  @ApiProperty({ description: 'Product description', example: 'A prestigious Bordeaux wine from the Médoc region', required: false })
  description?: string;

  @ApiProperty({ description: 'Category ID' })
  categoryId!: string;

  @ApiProperty({ description: 'Whether the product is active', default: true })
  isActive!: boolean;

  @ApiProperty({ description: 'Sort order for display', default: 0 })
  sortOrder!: number;

  @ApiProperty({ description: 'Additional metadata', required: false })
  metadata?: Record<string, any>;
}

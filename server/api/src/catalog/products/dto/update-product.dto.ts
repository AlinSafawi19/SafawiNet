import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const updateProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be less than 200 characters').optional(),
  slug: z.string().min(1, 'Slug is required').max(200, 'Slug must be less than 200 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens').optional(),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  categoryId: z.string().cuid('Invalid category ID').optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export class UpdateProductDto extends createZodDto(updateProductSchema) {
  @ApiProperty({ description: 'Product name', example: 'Château Margaux 2015', required: false })
  name?: string;

  @ApiProperty({ description: 'Product slug', example: 'chateau-margaux-2015', required: false })
  slug?: string;

  @ApiProperty({ description: 'Product description', example: 'A prestigious Bordeaux wine from the Médoc region', required: false })
  description?: string;

  @ApiProperty({ description: 'Category ID', required: false })
  categoryId?: string;

  @ApiProperty({ description: 'Whether the product is active', required: false })
  isActive?: boolean;

  @ApiProperty({ description: 'Sort order for display', required: false })
  sortOrder?: number;

  @ApiProperty({ description: 'Additional metadata', required: false })
  metadata?: Record<string, any>;
}

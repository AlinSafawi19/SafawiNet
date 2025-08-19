import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const createTaxCategorySchema = z.object({
  name: z.string().min(1, 'Tax category name is required').max(100, 'Tax category name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  isActive: z.boolean().default(true),
});

export class CreateTaxCategoryDto extends createZodDto(createTaxCategorySchema) {
  // Required properties for tax category creation
  @ApiProperty({ description: 'Tax category name', example: 'Standard Rate' })
  name!: string;

  @ApiProperty({ description: 'Tax category description', required: false })
  description?: string;

  @ApiProperty({ description: 'Whether the tax category is active', default: true })
  isActive!: boolean;
}

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const updateTaxCategorySchema = z.object({
  name: z.string().min(1, 'Tax category name is required').max(100, 'Tax category name must be 100 characters or less').optional(),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  isActive: z.boolean().optional(),
});

export class UpdateTaxCategoryDto extends createZodDto(updateTaxCategorySchema) {}

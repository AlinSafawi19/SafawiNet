import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const updateTaxRateSchema = z.object({
  taxCategoryId: z.string().cuid('Tax category ID must be a valid CUID').optional(),
  rate: z.number().min(0, 'Tax rate must be 0 or greater').max(1, 'Tax rate must be 1 or less').optional(),
  effectiveDate: z.date().optional(),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  isActive: z.boolean().optional(),
});

export class UpdateTaxRateDto extends createZodDto(updateTaxRateSchema) {}

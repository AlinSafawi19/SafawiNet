import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const createTaxRateSchema = z.object({
  taxCategoryId: z.string().cuid('Tax category ID must be a valid CUID'),
  rate: z.number().min(0, 'Tax rate must be 0 or greater').max(1, 'Tax rate must be 1 or less'),
  effectiveDate: z.date(),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  isActive: z.boolean().default(true),
});

export class CreateTaxRateDto extends createZodDto(createTaxRateSchema) {}

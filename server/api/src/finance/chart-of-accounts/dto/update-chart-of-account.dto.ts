import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const updateChartOfAccountSchema = z.object({
  code: z.string().min(1, 'Account code is required').max(20, 'Account code must be 20 characters or less').optional(),
  name: z.string().min(1, 'Account name is required').max(100, 'Account name must be 100 characters or less').optional(),
  type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']).optional(),
  parentId: z.string().cuid().optional(),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  isActive: z.boolean().optional(),
});

export class UpdateChartOfAccountDto extends createZodDto(updateChartOfAccountSchema) {}

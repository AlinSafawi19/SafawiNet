import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const createChartOfAccountSchema = z.object({
  code: z.string().min(1, 'Account code is required').max(20, 'Account code must be 20 characters or less'),
  name: z.string().min(1, 'Account name is required').max(100, 'Account name must be 100 characters or less'),
  type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']),
  parentId: z.string().cuid().optional(),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  isActive: z.boolean().default(true),
});

export class CreateChartOfAccountDto extends createZodDto(createChartOfAccountSchema) {
  @ApiProperty({ description: 'Account code', example: '1000' })
  code!: string;

  @ApiProperty({ description: 'Account name', example: 'Cash' })
  name!: string;

  @ApiProperty({ description: 'Account type', enum: ['asset', 'liability', 'equity', 'revenue', 'expense'], example: 'asset' })
  type!: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

  @ApiProperty({ description: 'Parent account ID', required: false })
  parentId?: string;

  @ApiProperty({ description: 'Account description', required: false })
  description?: string;

  @ApiProperty({ description: 'Whether the account is active', default: true })
  isActive!: boolean;
}

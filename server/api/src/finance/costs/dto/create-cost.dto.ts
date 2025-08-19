import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const createCostSchema = z.object({
  variantId: z.string().cuid('Invalid variant ID'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters').default('USD'),
  type: z.enum(['standard', 'actual', 'estimated']).default('standard'),
  effectiveFrom: z.date().optional(),
  effectiveTo: z.date().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
  createdBy: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export class CreateCostDto extends createZodDto(createCostSchema) {
  @ApiProperty({ description: 'Variant ID' })
  variantId!: string;

  @ApiProperty({ description: 'Cost amount', example: 45.50 })
  amount!: number;

  @ApiProperty({ description: 'Currency code', example: 'USD', default: 'USD' })
  currency!: string;

  @ApiProperty({ description: 'Cost type', enum: ['standard', 'actual', 'estimated'], default: 'standard' })
  type!: 'standard' | 'actual' | 'estimated';

  @ApiProperty({ description: 'Effective from date', required: false })
  effectiveFrom?: Date;

  @ApiProperty({ description: 'Effective to date', required: false })
  effectiveTo?: Date;

  @ApiProperty({ description: 'Whether the cost is active', default: true })
  isActive!: boolean;

  @ApiProperty({ description: 'Additional notes', example: 'Standard cost based on supplier pricing', required: false })
  notes?: string;

  @ApiProperty({ description: 'User ID who created the cost', required: false })
  createdBy?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  metadata?: Record<string, any>;
}

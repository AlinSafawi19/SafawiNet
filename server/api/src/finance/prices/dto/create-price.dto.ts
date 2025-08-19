import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const createPriceSchema = z.object({
  variantId: z.string().cuid('Invalid variant ID'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters').default('USD'),
  type: z.enum(['retail', 'wholesale', 'sale']).default('retail'),
  effectiveFrom: z.date().optional(),
  effectiveTo: z.date().optional(),
  isActive: z.boolean().default(true),
  createdBy: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export class CreatePriceDto extends createZodDto(createPriceSchema) {
  @ApiProperty({ description: 'Variant ID' })
  variantId!: string;

  @ApiProperty({ description: 'Price amount', example: 99.99 })
  amount!: number;

  @ApiProperty({ description: 'Currency code', example: 'USD', default: 'USD' })
  currency!: string;

  @ApiProperty({ description: 'Price type', enum: ['retail', 'wholesale', 'sale'], default: 'retail' })
  type!: 'retail' | 'wholesale' | 'sale';

  @ApiProperty({ description: 'Effective from date', required: false })
  effectiveFrom?: Date;

  @ApiProperty({ description: 'Effective to date', required: false })
  effectiveTo?: Date;

  @ApiProperty({ description: 'Whether the price is active', default: true })
  isActive!: boolean;

  @ApiProperty({ description: 'User ID who created the price', required: false })
  createdBy?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  metadata?: Record<string, any>;
}

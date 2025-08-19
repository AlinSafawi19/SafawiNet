import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const updatePriceSchema = z.object({
  amount: z.number().positive('Amount must be positive').optional(),
  currency: z.string().length(3, 'Currency must be 3 characters').optional(),
  type: z.enum(['retail', 'wholesale', 'sale']).optional(),
  effectiveFrom: z.date().optional(),
  effectiveTo: z.date().optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export class UpdatePriceDto extends createZodDto(updatePriceSchema) {
  @ApiProperty({ description: 'Price amount', example: 99.99, required: false })
  amount?: number;

  @ApiProperty({ description: 'Currency code', example: 'USD', required: false })
  currency?: string;

  @ApiProperty({ description: 'Price type', enum: ['retail', 'wholesale', 'sale'], required: false })
  type?: 'retail' | 'wholesale' | 'sale';

  @ApiProperty({ description: 'Effective from date', required: false })
  effectiveFrom?: Date;

  @ApiProperty({ description: 'Effective to date', required: false })
  effectiveTo?: Date;

  @ApiProperty({ description: 'Whether the price is active', required: false })
  isActive?: boolean;

  @ApiProperty({ description: 'Additional metadata', required: false })
  metadata?: Record<string, any>;
}

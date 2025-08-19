import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const updateCostSchema = z.object({
  amount: z.number().positive('Amount must be positive').optional(),
  currency: z.string().length(3, 'Currency must be 3 characters').optional(),
  type: z.enum(['standard', 'actual', 'estimated']).optional(),
  effectiveFrom: z.date().optional(),
  effectiveTo: z.date().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export class UpdateCostDto extends createZodDto(updateCostSchema) {
  @ApiProperty({ description: 'Cost amount', example: 45.50, required: false })
  amount?: number;

  @ApiProperty({ description: 'Currency code', example: 'USD', required: false })
  currency?: string;

  @ApiProperty({ description: 'Cost type', enum: ['standard', 'actual', 'estimated'], required: false })
  type?: 'standard' | 'actual' | 'estimated';

  @ApiProperty({ description: 'Effective from date', required: false })
  effectiveFrom?: Date;

  @ApiProperty({ description: 'Effective to date', required: false })
  effectiveTo?: Date;

  @ApiProperty({ description: 'Whether the cost is active', required: false })
  isActive?: boolean;

  @ApiProperty({ description: 'Additional notes', example: 'Standard cost based on supplier pricing', required: false })
  notes?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  metadata?: Record<string, any>;
}

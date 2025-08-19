import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const createVariantSchema = z.object({
  productId: z.string().cuid('Invalid product ID'),
  sku: z.string().min(1, 'SKU is required').max(50, 'SKU must be less than 50 characters'),
  name: z.string().min(1, 'Name is required').max(200, 'Name must be less than 200 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  weight: z.number().positive('Weight must be positive').optional(),
  dimensions: z.object({
    length: z.number().positive('Length must be positive').optional(),
    width: z.number().positive('Width must be positive').optional(),
    height: z.number().positive('Height must be positive').optional(),
  }).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
  metadata: z.record(z.string(), z.any()).optional(),
});

export class CreateVariantDto extends createZodDto(createVariantSchema) {
  @ApiProperty({ description: 'Product ID' })
  productId!: string;

  @ApiProperty({ description: 'Stock Keeping Unit', example: 'CHM-2015-750ML' })
  sku!: string;

  @ApiProperty({ description: 'Variant name', example: '750ml Bottle' })
  name!: string;

  @ApiProperty({ description: 'Variant description', example: 'Standard 750ml bottle', required: false })
  description?: string;

  @ApiProperty({ description: 'Weight in grams', example: 1500, required: false })
  weight?: number;

  @ApiProperty({ description: 'Product dimensions', required: false })
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };

  @ApiProperty({ description: 'Whether the variant is active', default: true })
  isActive!: boolean;

  @ApiProperty({ description: 'Sort order for display', default: 0 })
  sortOrder!: number;

  @ApiProperty({ description: 'Additional metadata', required: false })
  metadata?: Record<string, any>;
}

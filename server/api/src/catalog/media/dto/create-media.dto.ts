import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const createMediaSchema = z.object({
  productId: z.string().cuid('Invalid product ID'),
  variantId: z.string().cuid('Invalid variant ID').optional(),
  url: z.string().url('Invalid URL'),
  altText: z.string().max(200, 'Alt text must be less than 200 characters').optional(),
  type: z.enum(['image', 'video', 'document']).default('image'),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  metadata: z.record(z.string(), z.any()).optional(),
});

export class CreateMediaDto extends createZodDto(createMediaSchema) {
  @ApiProperty({ description: 'Product ID' })
  productId!: string;

  @ApiProperty({ description: 'Variant ID', required: false })
  variantId?: string;

  @ApiProperty({ description: 'Media URL', example: 'https://example.com/image.jpg' })
  url!: string;

  @ApiProperty({ description: 'Alt text for accessibility', example: 'Wine bottle image', required: false })
  altText?: string;

  @ApiProperty({ description: 'Media type', enum: ['image', 'video', 'document'], default: 'image' })
  type!: 'image' | 'video' | 'document';

  @ApiProperty({ description: 'Sort order for display', default: 0 })
  sortOrder!: number;

  @ApiProperty({ description: 'Whether the media is active', default: true })
  isActive!: boolean;

  @ApiProperty({ description: 'Additional metadata', required: false })
  metadata?: Record<string, any>;
}

import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const updateMediaSchema = z.object({
  url: z.string().url('Invalid URL').optional(),
  altText: z.string().max(200, 'Alt text must be less than 200 characters').optional(),
  type: z.enum(['image', 'video', 'document']).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export class UpdateMediaDto extends createZodDto(updateMediaSchema) {
  @ApiProperty({ description: 'Media URL', example: 'https://example.com/image.jpg', required: false })
  url?: string;

  @ApiProperty({ description: 'Alt text for accessibility', example: 'Wine bottle image', required: false })
  altText?: string;

  @ApiProperty({ description: 'Media type', enum: ['image', 'video', 'document'], required: false })
  type?: 'image' | 'video' | 'document';

  @ApiProperty({ description: 'Sort order for display', required: false })
  sortOrder?: number;

  @ApiProperty({ description: 'Whether the media is active', required: false })
  isActive?: boolean;

  @ApiProperty({ description: 'Additional metadata', required: false })
  metadata?: Record<string, any>;
}

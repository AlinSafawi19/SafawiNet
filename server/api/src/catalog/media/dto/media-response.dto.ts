import { ApiProperty } from '@nestjs/swagger';

export class MediaResponseDto {
  @ApiProperty({ description: 'Media ID' })
  id!: string;

  @ApiProperty({ description: 'Product ID' })
  productId!: string;

  @ApiProperty({ description: 'Variant ID', required: false })
  variantId?: string;

  @ApiProperty({ description: 'Media URL' })
  url!: string;

  @ApiProperty({ description: 'Alt text for accessibility', required: false })
  altText?: string;

  @ApiProperty({ description: 'Media type' })
  type!: string;

  @ApiProperty({ description: 'Sort order for display' })
  sortOrder!: number;

  @ApiProperty({ description: 'Whether the media is active' })
  isActive!: boolean;

  @ApiProperty({ description: 'Additional metadata', required: false })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;

  @ApiProperty({ description: 'Product information', required: false })
  product?: {
    id: string;
    name: string;
    slug: string;
  };

  @ApiProperty({ description: 'Variant information', required: false })
  variant?: {
    id: string;
    sku: string;
    name: string;
  };
}

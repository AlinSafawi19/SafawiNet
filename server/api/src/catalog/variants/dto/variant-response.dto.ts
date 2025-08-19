import { ApiProperty } from '@nestjs/swagger';

export class VariantResponseDto {
  @ApiProperty({ description: 'Variant ID' })
  id!: string;

  @ApiProperty({ description: 'Product ID' })
  productId!: string;

  @ApiProperty({ description: 'Stock Keeping Unit' })
  sku!: string;

  @ApiProperty({ description: 'Variant name' })
  name!: string;

  @ApiProperty({ description: 'Variant description', required: false })
  description?: string;

  @ApiProperty({ description: 'Weight in grams', required: false })
  weight?: number;

  @ApiProperty({ description: 'Product dimensions', required: false })
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };

  @ApiProperty({ description: 'Whether the variant is active' })
  isActive!: boolean;

  @ApiProperty({ description: 'Sort order for display' })
  sortOrder!: number;

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

  @ApiProperty({ description: 'Variant media', type: [Object], required: false })
  media?: Array<{
    id: string;
    url: string;
    altText?: string;
    type: string;
    sortOrder: number;
  }>;
}

import { ApiProperty } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty({ description: 'Product ID' })
  id!: string;

  @ApiProperty({ description: 'Product name' })
  name!: string;

  @ApiProperty({ description: 'Product slug' })
  slug!: string;

  @ApiProperty({ description: 'Product description', required: false })
  description?: string;

  @ApiProperty({ description: 'Category ID' })
  categoryId!: string;

  @ApiProperty({ description: 'Whether the product is active' })
  isActive!: boolean;

  @ApiProperty({ description: 'Sort order for display' })
  sortOrder!: number;

  @ApiProperty({ description: 'Additional metadata', required: false })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;

  @ApiProperty({ description: 'Category information', required: false })
  category?: {
    id: string;
    name: string;
    slug: string;
  };

  @ApiProperty({ description: 'Product variants', type: [Object], required: false })
  variants?: Array<{
    id: string;
    sku: string;
    name: string;
    isActive: boolean;
  }>;

  @ApiProperty({ description: 'Product media', type: [Object], required: false })
  media?: Array<{
    id: string;
    url: string;
    altText?: string;
    type: string;
    sortOrder: number;
  }>;
}

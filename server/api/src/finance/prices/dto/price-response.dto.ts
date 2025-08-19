import { ApiProperty } from '@nestjs/swagger';

export class PriceResponseDto {
  @ApiProperty({ description: 'Price ID' })
  id!: string;

  @ApiProperty({ description: 'Variant ID' })
  variantId!: string;

  @ApiProperty({ description: 'Price amount' })
  amount!: number;

  @ApiProperty({ description: 'Currency code' })
  currency!: string;

  @ApiProperty({ description: 'Price type' })
  type!: string;

  @ApiProperty({ description: 'Effective from date' })
  effectiveFrom!: Date;

  @ApiProperty({ description: 'Effective to date', required: false })
  effectiveTo?: Date;

  @ApiProperty({ description: 'Whether the price is active' })
  isActive!: boolean;

  @ApiProperty({ description: 'Price version' })
  version!: number;

  @ApiProperty({ description: 'User ID who created the price', required: false })
  createdBy?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;

  @ApiProperty({ description: 'Variant information', required: false })
  variant?: {
    id: string;
    sku: string;
    name: string;
    product: {
      id: string;
      name: string;
      slug: string;
    };
  };
}

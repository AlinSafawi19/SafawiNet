import { ApiProperty } from '@nestjs/swagger';

export class CostResponseDto {
  @ApiProperty({ description: 'Cost ID' })
  id!: string;

  @ApiProperty({ description: 'Variant ID' })
  variantId!: string;

  @ApiProperty({ description: 'Cost amount' })
  amount!: number;

  @ApiProperty({ description: 'Currency code' })
  currency!: string;

  @ApiProperty({ description: 'Cost type' })
  type!: string;

  @ApiProperty({ description: 'Effective from date' })
  effectiveFrom!: Date;

  @ApiProperty({ description: 'Effective to date', required: false })
  effectiveTo?: Date;

  @ApiProperty({ description: 'Whether the cost is active' })
  isActive!: boolean;

  @ApiProperty({ description: 'Additional notes', required: false })
  notes?: string;

  @ApiProperty({ description: 'User ID who created the cost', required: false })
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

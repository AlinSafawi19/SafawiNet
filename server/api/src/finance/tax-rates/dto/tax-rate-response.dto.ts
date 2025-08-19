import { ApiProperty } from '@nestjs/swagger';

export class TaxRateResponseDto {
  @ApiProperty({ description: 'Unique identifier for the tax rate' })
  id!: string;

  @ApiProperty({ description: 'Tax category ID' })
  taxCategoryId!: string;

  @ApiProperty({ description: 'Tax rate (decimal, e.g., 0.08 for 8%)' })
  rate!: number;

  @ApiProperty({ description: 'Effective date for this tax rate' })
  effectiveDate!: Date;

  @ApiProperty({ description: 'Tax rate description', required: false })
  description?: string;

  @ApiProperty({ description: 'Whether the tax rate is active' })
  isActive!: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;

  @ApiProperty({ description: 'Associated tax category' })
  taxCategory!: any;
}

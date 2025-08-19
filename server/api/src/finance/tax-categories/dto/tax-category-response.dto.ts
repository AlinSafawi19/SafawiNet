import { ApiProperty } from '@nestjs/swagger';

export class TaxCategoryResponseDto {
  @ApiProperty({ description: 'Unique identifier for the tax category' })
  id!: string;

  @ApiProperty({ description: 'Tax category name' })
  name!: string;

  @ApiProperty({ description: 'Tax category description', required: false })
  description?: string;

  @ApiProperty({ description: 'Whether the tax category is active' })
  isActive!: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;

  @ApiProperty({ description: 'Associated tax rates', type: 'array' })
  rates!: any[];

  @ApiProperty({ description: 'Associated tax mappings', type: 'array' })
  mappings!: any[];
}

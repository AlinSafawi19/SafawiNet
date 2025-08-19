import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({ description: 'Category ID' })
  id!: string;

  @ApiProperty({ description: 'Category name' })
  name!: string;

  @ApiProperty({ description: 'Category slug' })
  slug!: string;

  @ApiProperty({ description: 'Category description', required: false })
  description?: string;

  @ApiProperty({ description: 'Parent category ID', required: false })
  parentId?: string;

  @ApiProperty({ description: 'Category image URL', required: false })
  imageUrl?: string;

  @ApiProperty({ description: 'Whether the category is active' })
  isActive!: boolean;

  @ApiProperty({ description: 'Sort order for display' })
  sortOrder!: number;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;

  @ApiProperty({ description: 'Child categories', type: [CategoryResponseDto], required: false })
  children?: CategoryResponseDto[];

  @ApiProperty({ description: 'Parent category', type: CategoryResponseDto, required: false })
  parent?: CategoryResponseDto;
}

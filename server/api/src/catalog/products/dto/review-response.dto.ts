import { ApiProperty } from '@nestjs/swagger';

export class ReviewResponseDto {
  @ApiProperty({ description: 'Review ID' })
  id!: string;

  @ApiProperty({ description: 'Product ID' })
  productId!: string;

  @ApiProperty({ description: 'User ID' })
  userId!: string;

  @ApiProperty({ description: 'User name' })
  userName!: string;

  @ApiProperty({ description: 'Review rating from 1 to 5' })
  rating!: number;

  @ApiProperty({ description: 'Review title', required: false })
  title?: string;

  @ApiProperty({ description: 'Review content' })
  content!: string;

  @ApiProperty({ description: 'Whether the review is approved' })
  isApproved!: boolean;

  @ApiProperty({ description: 'Whether the review is active' })
  isActive!: boolean;

  @ApiProperty({ description: 'Review creation date' })
  createdAt!: Date;

  @ApiProperty({ description: 'Review last update date' })
  updatedAt!: Date;
}

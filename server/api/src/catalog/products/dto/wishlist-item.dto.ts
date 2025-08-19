import { ApiProperty } from '@nestjs/swagger';

export class WishlistItemDto {
  @ApiProperty({ description: 'Wishlist item ID' })
  id!: string;

  @ApiProperty({ description: 'Product ID' })
  productId!: string;

  @ApiProperty({ description: 'Product name' })
  productName!: string;

  @ApiProperty({ description: 'Product slug' })
  productSlug!: string;

  @ApiProperty({ description: 'Product description', required: false })
  productDescription?: string;

  @ApiProperty({ description: 'Product image URL', required: false })
  productImageUrl?: string;

  @ApiProperty({ description: 'Date added to wishlist' })
  createdAt!: Date;
}

import { IsString, IsInt, IsPositive, IsOptional, IsObject } from 'class-validator';

export class AddCartItemDto {
  @IsString()
  variantId!: string;

  @IsInt()
  @IsPositive()
  quantity!: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateCartItemDto {
  @IsInt()
  @IsPositive()
  quantity!: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CartItemResponseDto {
  id!: string;
  variantId!: string;
  quantity!: number;
  metadata?: Record<string, any>;
  createdAt!: Date;
  updatedAt!: Date;
  variant!: {
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

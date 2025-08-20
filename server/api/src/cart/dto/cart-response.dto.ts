import { CartItemResponseDto } from './cart-item.dto';

export class CartResponseDto {
  id!: string;
  userId?: string;
  sessionId?: string;
  currency!: string;
  status!: string;
  metadata?: Record<string, any>;
  createdAt!: Date;
  updatedAt!: Date;
  items!: CartItemResponseDto[];
  totals!: CartTotalsDto;
}

export class CartTotalsDto {
  subtotal!: number;
  discounts!: number;
  shipping!: number;
  tax!: number;
  total!: number;
  currency!: string;
}

export class ShippingMethodDto {
  id!: string;
  name!: string;
  description?: string | null;
  price!: number;
  currency!: string;
  deliveryTime?: string | null;
  minOrderValue?: number | null;
  maxOrderValue?: number | null;
}

export class ShippingZoneDto {
  id!: string;
  name!: string;
  description?: string | null;
  countries!: string[];
  postalCodes!: string[];
  methods!: ShippingMethodDto[];
}

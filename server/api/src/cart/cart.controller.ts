import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { ShippingService } from './shipping.service';
import {
  AddCartItemDto,
  UpdateCartItemDto,
  CartResponseDto,
  ShippingQueryDto,
  TaxCalculationDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('cart')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly shippingService: ShippingService,
  ) {}

  /**
   * GET /cart - Get or create cart for current user/session
   */
  @Get()
  @Roles(Role.CUSTOMER)
  async getCart(@Request() req): Promise<CartResponseDto> {
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'] || req.sessionId;
    
    return this.cartService.getOrCreateCart(userId, sessionId);
  }

  /**
   * POST /cart/items - Add item to cart
   */
  @Post('items')
  @Roles(Role.CUSTOMER)
  async addItem(
    @Request() req,
    @Body() addItemDto: AddCartItemDto
  ): Promise<CartResponseDto> {
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'] || req.sessionId;
    
    const cart = await this.cartService.getOrCreateCart(userId, sessionId);
    return this.cartService.addItem(cart.id, addItemDto);
  }

  /**
   * PUT /cart/items/:variantId - Update cart item quantity
   */
  @Put('items/:variantId')
  @Roles(Role.CUSTOMER)
  async updateItem(
    @Request() req,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() updateItemDto: UpdateCartItemDto
  ): Promise<CartResponseDto> {
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'] || req.sessionId;
    
    const cart = await this.cartService.getOrCreateCart(userId, sessionId);
    return this.cartService.updateItem(cart.id, variantId, updateItemDto);
  }

  /**
   * DELETE /cart/items/:variantId - Remove item from cart
   */
  @Delete('items/:variantId')
  @Roles(Role.CUSTOMER)
  async removeItem(
    @Request() req,
    @Param('variantId', ParseUUIDPipe) variantId: string
  ): Promise<CartResponseDto> {
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'] || req.sessionId;
    
    const cart = await this.cartService.getOrCreateCart(userId, sessionId);
    return this.cartService.removeItem(cart.id, variantId);
  }

  /**
   * DELETE /cart - Clear cart
   */
  @Delete()
  @Roles(Role.CUSTOMER)
  async clearCart(@Request() req): Promise<void> {
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'] || req.sessionId;
    
    const cart = await this.cartService.getOrCreateCart(userId, sessionId);
    return this.cartService.clearCart(cart.id);
  }

  /**
   * GET /cart/shipping-methods - Get available shipping methods
   */
  @Get('shipping-methods')
  @Roles(Role.CUSTOMER)
  async getShippingMethods(
    @Query() query: ShippingQueryDto,
    @Request() req
  ) {
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'] || req.sessionId;
    
    // Get cart to calculate subtotal for shipping method filtering
    const cart = await this.cartService.getOrCreateCart(userId, sessionId);
    const subtotal = cart.totals.subtotal;

    return this.shippingService.getShippingMethods(
      {
        country: query.country,
        postalCode: query.postalCode,
      },
      subtotal,
      cart.currency
    );
  }

  /**
   * GET /cart/totals - Get cart totals with shipping and tax
   */
  @Get('totals')
  @Roles(Role.CUSTOMER)
  async getCartTotals(
    @Query() query: TaxCalculationDto,
    @Request() req
  ) {
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'] || req.sessionId;
    
    const cart = await this.cartService.getOrCreateCart(userId, sessionId);
    
    // For now, we'll return totals without shipping method selection
    // In a real implementation, you might want to store the selected shipping method
    const totals = await this.cartService.calculateCartTotals(
      cart.id,
      {
        country: query.country,
        postalCode: query.postalCode,
      }
    );

    return totals;
  }

  /**
   * GET /cart/shipping-zones - Get all shipping zones (admin only)
   */
  @Get('shipping-zones')
  @Roles(Role.ADMIN)
  async getShippingZones() {
    return this.shippingService.getShippingZones();
  }
}

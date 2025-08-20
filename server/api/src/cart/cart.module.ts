import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { PricingEngineService } from './pricing-engine.service';
import { TaxEngineService } from './tax-engine.service';
import { ShippingService } from './shipping.service';
import { PrismaService } from '../common/services/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CartController],
  providers: [
    CartService,
    PricingEngineService,
    TaxEngineService,
    ShippingService,
    PrismaService,
  ],
  exports: [CartService, PricingEngineService, TaxEngineService, ShippingService],
})
export class CartModule {}

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CategoriesController } from './categories/categories.controller';
import { CategoriesService } from './categories/categories.service';
import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';
import { VariantsController } from './variants/variants.controller';
import { VariantsService } from './variants/variants.service';
import { MediaController } from './media/media.controller';
import { MediaService } from './media/media.service';
import { StorefrontController } from './storefront/storefront.controller';
import { StorefrontService } from './storefront/storefront.service';
import { ReviewsController, AdminReviewsController } from './products/reviews.controller';
import { ReviewsService } from './products/reviews.service';
import { WishlistController } from './products/wishlist.controller';
import { WishlistService } from './products/wishlist.service';
import { PrismaService } from '../common/services/prisma.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    CategoriesController,
    ProductsController,
    VariantsController,
    MediaController,
    StorefrontController,
    ReviewsController,
    AdminReviewsController,
    WishlistController,
  ],
  providers: [
    CategoriesService,
    ProductsService,
    VariantsService,
    MediaService,
    StorefrontService,
    ReviewsService,
    WishlistService,
    PrismaService,
  ],
  exports: [
    CategoriesService,
    ProductsService,
    VariantsService,
    MediaService,
    StorefrontService,
    ReviewsService,
    WishlistService,
  ],
})
export class CatalogModule {}

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PricesController } from './prices/prices.controller';
import { PricesService } from './prices/prices.service';
import { CostsController } from './costs/costs.controller';
import { CostsService } from './costs/costs.service';
import { TaxCategoriesController } from './tax-categories/tax-categories.controller';
import { TaxCategoriesService } from './tax-categories/tax-categories.service';
import { TaxRatesController } from './tax-rates/tax-rates.controller';
import { TaxRatesService } from './tax-rates/tax-rates.service';
import { ChartOfAccountsController } from './chart-of-accounts/chart-of-accounts.controller';
import { ChartOfAccountsService } from './chart-of-accounts/chart-of-accounts.service';
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
    PricesController,
    CostsController,
    TaxCategoriesController,
    TaxRatesController,
    ChartOfAccountsController,
  ],
  providers: [
    PricesService,
    CostsService,
    TaxCategoriesService,
    TaxRatesService,
    ChartOfAccountsService,
    PrismaService,
  ],
  exports: [
    PricesService,
    CostsService,
    TaxCategoriesService,
    TaxRatesService,
    ChartOfAccountsService,
  ],
})
export class FinanceModule {}

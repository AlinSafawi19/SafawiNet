import { IsString, IsOptional } from 'class-validator';

export class ShippingQueryDto {
  @IsString()
  country!: string;

  @IsOptional()
  @IsString()
  postalCode?: string;
}

export class TaxCalculationDto {
  @IsString()
  country!: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;
}

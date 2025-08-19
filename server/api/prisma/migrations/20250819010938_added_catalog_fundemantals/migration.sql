-- CreateTable
CREATE TABLE "public"."categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" CITEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" CITEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "weight" DOUBLE PRECISION,
    "dimensions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_media" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "type" TEXT NOT NULL DEFAULT 'image',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chart_of_accounts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tax_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tax_rates" (
    "id" TEXT NOT NULL,
    "taxCategoryId" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tax_category_mappings" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "taxCategoryId" TEXT NOT NULL,
    "glAccountId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_category_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."prices" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "type" TEXT NOT NULL DEFAULT 'retail',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."costs" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "type" TEXT NOT NULL DEFAULT 'standard',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdBy" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "costs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "public"."categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "public"."categories"("parentId");

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "public"."categories"("slug");

-- CreateIndex
CREATE INDEX "categories_isActive_idx" ON "public"."categories"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "public"."products"("slug");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "public"."products"("categoryId");

-- CreateIndex
CREATE INDEX "products_slug_idx" ON "public"."products"("slug");

-- CreateIndex
CREATE INDEX "products_isActive_idx" ON "public"."products"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "public"."product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_productId_idx" ON "public"."product_variants"("productId");

-- CreateIndex
CREATE INDEX "product_variants_sku_idx" ON "public"."product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_isActive_idx" ON "public"."product_variants"("isActive");

-- CreateIndex
CREATE INDEX "product_media_productId_idx" ON "public"."product_media"("productId");

-- CreateIndex
CREATE INDEX "product_media_variantId_idx" ON "public"."product_media"("variantId");

-- CreateIndex
CREATE INDEX "product_media_isActive_idx" ON "public"."product_media"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_accounts_code_key" ON "public"."chart_of_accounts"("code");

-- CreateIndex
CREATE INDEX "chart_of_accounts_parentId_idx" ON "public"."chart_of_accounts"("parentId");

-- CreateIndex
CREATE INDEX "chart_of_accounts_code_idx" ON "public"."chart_of_accounts"("code");

-- CreateIndex
CREATE INDEX "chart_of_accounts_type_idx" ON "public"."chart_of_accounts"("type");

-- CreateIndex
CREATE INDEX "chart_of_accounts_isActive_idx" ON "public"."chart_of_accounts"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "tax_categories_name_key" ON "public"."tax_categories"("name");

-- CreateIndex
CREATE INDEX "tax_categories_isActive_idx" ON "public"."tax_categories"("isActive");

-- CreateIndex
CREATE INDEX "tax_rates_taxCategoryId_idx" ON "public"."tax_rates"("taxCategoryId");

-- CreateIndex
CREATE INDEX "tax_rates_effectiveFrom_effectiveTo_idx" ON "public"."tax_rates"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "tax_rates_isActive_idx" ON "public"."tax_rates"("isActive");

-- CreateIndex
CREATE INDEX "tax_category_mappings_variantId_idx" ON "public"."tax_category_mappings"("variantId");

-- CreateIndex
CREATE INDEX "tax_category_mappings_taxCategoryId_idx" ON "public"."tax_category_mappings"("taxCategoryId");

-- CreateIndex
CREATE INDEX "tax_category_mappings_glAccountId_idx" ON "public"."tax_category_mappings"("glAccountId");

-- CreateIndex
CREATE INDEX "tax_category_mappings_isActive_idx" ON "public"."tax_category_mappings"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "tax_category_mappings_variantId_taxCategoryId_key" ON "public"."tax_category_mappings"("variantId", "taxCategoryId");

-- CreateIndex
CREATE INDEX "prices_variantId_idx" ON "public"."prices"("variantId");

-- CreateIndex
CREATE INDEX "prices_type_idx" ON "public"."prices"("type");

-- CreateIndex
CREATE INDEX "prices_effectiveFrom_effectiveTo_idx" ON "public"."prices"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "prices_isActive_idx" ON "public"."prices"("isActive");

-- CreateIndex
CREATE INDEX "prices_currency_idx" ON "public"."prices"("currency");

-- CreateIndex
CREATE INDEX "costs_variantId_idx" ON "public"."costs"("variantId");

-- CreateIndex
CREATE INDEX "costs_type_idx" ON "public"."costs"("type");

-- CreateIndex
CREATE INDEX "costs_effectiveFrom_effectiveTo_idx" ON "public"."costs"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "costs_isActive_idx" ON "public"."costs"("isActive");

-- CreateIndex
CREATE INDEX "costs_currency_idx" ON "public"."costs"("currency");

-- AddForeignKey
ALTER TABLE "public"."categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_media" ADD CONSTRAINT "product_media_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_media" ADD CONSTRAINT "product_media_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tax_rates" ADD CONSTRAINT "tax_rates_taxCategoryId_fkey" FOREIGN KEY ("taxCategoryId") REFERENCES "public"."tax_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tax_category_mappings" ADD CONSTRAINT "tax_category_mappings_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tax_category_mappings" ADD CONSTRAINT "tax_category_mappings_taxCategoryId_fkey" FOREIGN KEY ("taxCategoryId") REFERENCES "public"."tax_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tax_category_mappings" ADD CONSTRAINT "tax_category_mappings_glAccountId_fkey" FOREIGN KEY ("glAccountId") REFERENCES "public"."chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prices" ADD CONSTRAINT "prices_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."costs" ADD CONSTRAINT "costs_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

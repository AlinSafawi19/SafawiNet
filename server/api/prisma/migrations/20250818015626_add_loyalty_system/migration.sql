-- CreateTable
CREATE TABLE "public"."loyalty_tiers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minPoints" INTEGER NOT NULL,
    "maxPoints" INTEGER,
    "benefits" JSONB,
    "color" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."loyalty_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentTierId" TEXT NOT NULL,
    "currentPoints" INTEGER NOT NULL DEFAULT 0,
    "lifetimePoints" INTEGER NOT NULL DEFAULT 0,
    "tierUpgradedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."loyalty_transactions" (
    "id" TEXT NOT NULL,
    "loyaltyAccountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "orderId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_tiers_name_key" ON "public"."loyalty_tiers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_tiers_minPoints_key" ON "public"."loyalty_tiers"("minPoints");

-- CreateIndex
CREATE INDEX "loyalty_tiers_minPoints_idx" ON "public"."loyalty_tiers"("minPoints");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_accounts_userId_key" ON "public"."loyalty_accounts"("userId");

-- CreateIndex
CREATE INDEX "loyalty_accounts_currentPoints_idx" ON "public"."loyalty_accounts"("currentPoints");

-- CreateIndex
CREATE INDEX "loyalty_accounts_currentTierId_idx" ON "public"."loyalty_accounts"("currentTierId");

-- CreateIndex
CREATE INDEX "loyalty_transactions_loyaltyAccountId_createdAt_idx" ON "public"."loyalty_transactions"("loyaltyAccountId", "createdAt");

-- CreateIndex
CREATE INDEX "loyalty_transactions_type_createdAt_idx" ON "public"."loyalty_transactions"("type", "createdAt");

-- CreateIndex
CREATE INDEX "loyalty_transactions_expiresAt_idx" ON "public"."loyalty_transactions"("expiresAt");

-- AddForeignKey
ALTER TABLE "public"."loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_currentTierId_fkey" FOREIGN KEY ("currentTierId") REFERENCES "public"."loyalty_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_loyaltyAccountId_fkey" FOREIGN KEY ("loyaltyAccountId") REFERENCES "public"."loyalty_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

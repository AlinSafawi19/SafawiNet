-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "recoveryEmail" CITEXT;

-- CreateTable
CREATE TABLE "public"."recovery_staging" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "newEmail" CITEXT NOT NULL,
    "recoveryTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recovery_staging_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recovery_staging_userId_key" ON "public"."recovery_staging"("userId");

-- CreateIndex
CREATE INDEX "recovery_staging_expiresAt_idx" ON "public"."recovery_staging"("expiresAt");

-- AddForeignKey
ALTER TABLE "public"."recovery_staging" ADD CONSTRAINT "recovery_staging_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

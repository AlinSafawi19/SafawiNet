-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."one_time_tokens" (
    "id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "one_time_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."refresh_sessions" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "refreshHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "one_time_tokens_hash_key" ON "public"."one_time_tokens"("hash");

-- CreateIndex
CREATE INDEX "one_time_tokens_purpose_hash_idx" ON "public"."one_time_tokens"("purpose", "hash");

-- CreateIndex
CREATE INDEX "one_time_tokens_expiresAt_idx" ON "public"."one_time_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_sessions_tokenId_key" ON "public"."refresh_sessions"("tokenId");

-- CreateIndex
CREATE INDEX "refresh_sessions_familyId_idx" ON "public"."refresh_sessions"("familyId");

-- CreateIndex
CREATE INDEX "refresh_sessions_expiresAt_idx" ON "public"."refresh_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "refresh_sessions_isActive_idx" ON "public"."refresh_sessions"("isActive");

-- AddForeignKey
ALTER TABLE "public"."one_time_tokens" ADD CONSTRAINT "one_time_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refresh_sessions" ADD CONSTRAINT "refresh_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

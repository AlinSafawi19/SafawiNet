-- CreateTable
CREATE TABLE "public"."offline_messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "expiresAt" TIMESTAMP(3),
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offline_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "offline_messages_userId_idx" ON "public"."offline_messages"("userId");

-- CreateIndex
CREATE INDEX "offline_messages_type_idx" ON "public"."offline_messages"("type");

-- CreateIndex
CREATE INDEX "offline_messages_event_idx" ON "public"."offline_messages"("event");

-- CreateIndex
CREATE INDEX "offline_messages_isProcessed_idx" ON "public"."offline_messages"("isProcessed");

-- CreateIndex
CREATE INDEX "offline_messages_expiresAt_idx" ON "public"."offline_messages"("expiresAt");

-- CreateIndex
CREATE INDEX "offline_messages_userId_isProcessed_createdAt_idx" ON "public"."offline_messages"("userId", "isProcessed", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."offline_messages" ADD CONSTRAINT "offline_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

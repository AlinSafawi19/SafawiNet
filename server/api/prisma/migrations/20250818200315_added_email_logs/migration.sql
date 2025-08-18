-- CreateTable
CREATE TABLE "public"."email_logs" (
    "id" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_logs_email_createdAt_idx" ON "public"."email_logs"("email", "createdAt");

-- CreateIndex
CREATE INDEX "email_logs_status_createdAt_idx" ON "public"."email_logs"("status", "createdAt");

-- CreateIndex
CREATE INDEX "email_logs_type_createdAt_idx" ON "public"."email_logs"("type", "createdAt");

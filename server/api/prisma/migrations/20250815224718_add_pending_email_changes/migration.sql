-- CreateTable
CREATE TABLE "public"."pending_email_changes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "newEmail" CITEXT NOT NULL,
    "changeTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_email_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pending_email_changes_expiresAt_idx" ON "public"."pending_email_changes"("expiresAt");

-- CreateIndex
CREATE INDEX "pending_email_changes_changeTokenHash_idx" ON "public"."pending_email_changes"("changeTokenHash");

-- AddForeignKey
ALTER TABLE "public"."pending_email_changes" ADD CONSTRAINT "pending_email_changes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

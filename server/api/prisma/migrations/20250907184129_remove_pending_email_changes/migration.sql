/*
  Warnings:

  - You are about to drop the `pending_email_changes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."pending_email_changes" DROP CONSTRAINT "pending_email_changes_userId_fkey";

-- DropTable
DROP TABLE "public"."pending_email_changes";

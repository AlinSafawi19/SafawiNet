/*
  Warnings:

  - You are about to drop the column `recoveryEmail` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `recovery_staging` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."recovery_staging" DROP CONSTRAINT "recovery_staging_userId_fkey";

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "recoveryEmail";

-- DropTable
DROP TABLE "public"."recovery_staging";

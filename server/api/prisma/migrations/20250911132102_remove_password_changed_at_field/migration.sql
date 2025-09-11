/*
  Warnings:

  - You are about to drop the column `passwordChangedAt` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "passwordChangedAt";

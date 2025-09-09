-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "passwordChangedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

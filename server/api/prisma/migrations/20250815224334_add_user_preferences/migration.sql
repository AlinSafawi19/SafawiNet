-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "notificationPreferences" JSONB,
ADD COLUMN     "preferences" JSONB;

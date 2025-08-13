-- Enable citext extension
CREATE EXTENSION IF NOT EXISTS citext;

-- AlterTable
ALTER TABLE "public"."users" ALTER COLUMN "email" SET DATA TYPE CITEXT;

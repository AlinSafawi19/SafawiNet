-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('CUSTOMER', 'ADMIN', 'MODERATOR', 'SUPPORT');

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "roles" "public"."Role"[] DEFAULT ARRAY['CUSTOMER']::"public"."Role"[];

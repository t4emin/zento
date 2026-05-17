-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('unpaid', 'pending_review', 'paid');

-- CreateEnum
CREATE TYPE "public"."RestaurantMode" AS ENUM ('normal', 'buffet', 'hybrid');

-- AlterTable
ALTER TABLE "public"."orders"
ADD COLUMN "note" TEXT,
ADD COLUMN "payment_status" "public"."PaymentStatus" NOT NULL DEFAULT 'unpaid';

-- AlterTable
ALTER TABLE "public"."restaurant_settings"
ADD COLUMN "mode" "public"."RestaurantMode" NOT NULL DEFAULT 'normal';

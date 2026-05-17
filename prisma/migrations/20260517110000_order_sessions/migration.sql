-- CreateEnum
CREATE TYPE "public"."OrderSessionStatus" AS ENUM ('active', 'closed', 'expired');

-- AlterTable
ALTER TABLE "public"."orders"
ADD COLUMN "order_session_id" TEXT;

-- CreateTable
CREATE TABLE "public"."order_sessions" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "table_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "public"."OrderSessionStatus" NOT NULL DEFAULT 'active',
    "customer_count" INTEGER,
    "note" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_sessions_code_key" ON "public"."order_sessions"("code");

-- CreateIndex
CREATE INDEX "order_sessions_restaurant_id_status_started_at_idx" ON "public"."order_sessions"("restaurant_id", "status", "started_at");

-- CreateIndex
CREATE INDEX "order_sessions_table_id_status_started_at_idx" ON "public"."order_sessions"("table_id", "status", "started_at");

-- CreateIndex
CREATE INDEX "orders_order_session_id_created_at_idx" ON "public"."orders"("order_session_id", "created_at");

-- AddForeignKey
ALTER TABLE "public"."order_sessions" ADD CONSTRAINT "order_sessions_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_sessions" ADD CONSTRAINT "order_sessions_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_order_session_id_fkey" FOREIGN KEY ("order_session_id") REFERENCES "public"."order_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

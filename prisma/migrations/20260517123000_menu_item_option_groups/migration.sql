-- CreateEnum
CREATE TYPE "public"."MenuOptionGroupType" AS ENUM ('single', 'multiple');

-- AlterTable
ALTER TABLE "public"."order_items"
ADD COLUMN "selected_options_snapshot" JSONB;

-- CreateTable
CREATE TABLE "public"."menu_option_groups" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "menu_item_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."MenuOptionGroupType" NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "min_select" INTEGER NOT NULL DEFAULT 0,
    "max_select" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_option_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."menu_option_items" (
    "id" TEXT NOT NULL,
    "option_group_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_delta" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_option_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "menu_option_groups_restaurant_id_menu_item_id_sort_order_idx" ON "public"."menu_option_groups"("restaurant_id", "menu_item_id", "sort_order");

-- CreateIndex
CREATE INDEX "menu_option_items_option_group_id_sort_order_idx" ON "public"."menu_option_items"("option_group_id", "sort_order");

-- AddForeignKey
ALTER TABLE "public"."menu_option_groups" ADD CONSTRAINT "menu_option_groups_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."menu_option_groups" ADD CONSTRAINT "menu_option_groups_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."menu_option_items" ADD CONSTRAINT "menu_option_items_option_group_id_fkey" FOREIGN KEY ("option_group_id") REFERENCES "public"."menu_option_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

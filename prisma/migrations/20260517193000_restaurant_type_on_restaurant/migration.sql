CREATE TYPE "public"."RestaurantType" AS ENUM ('normal', 'buffet');

ALTER TABLE "public"."restaurants"
ADD COLUMN "type" "public"."RestaurantType" NOT NULL DEFAULT 'normal';

UPDATE "public"."restaurants" AS r
SET "type" = CASE
  WHEN rs."mode" IN ('buffet', 'hybrid') THEN 'buffet'::"public"."RestaurantType"
  ELSE 'normal'::"public"."RestaurantType"
END
FROM "public"."restaurant_settings" AS rs
WHERE rs."restaurant_id" = r."id";

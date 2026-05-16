import { createCustomerTablePath } from "@/lib/restaurants";

function readPublicAppUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "";

  return String(configuredUrl).trim().replace(/\/+$/, "");
}

export function getConfiguredPublicAppUrl() {
  return readPublicAppUrl();
}

export function createCustomerTableUrl(restaurantSlug, tableCode, origin = "") {
  const baseOrigin = String(origin || readPublicAppUrl()).trim().replace(/\/+$/, "");
  const path = createCustomerTablePath(restaurantSlug, tableCode);

  return baseOrigin ? `${baseOrigin}${path}` : path;
}

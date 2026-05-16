import { UserRole } from "@prisma/client";

export const RESTAURANT_SLUG_REGEX = /^[a-z0-9-]+$/;
export const MIN_PASSWORD_LENGTH = 8;
export const MIN_TABLE_COUNT = 1;
export const MAX_TABLE_COUNT = 100;
export const DEFAULT_RESTAURANT_CURRENCY = "THB";
export const DEFAULT_RESTAURANT_TIMEZONE = "Asia/Bangkok";
export const OWNER_ROLE = UserRole.owner;

export function normalizeRestaurantSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function isValidRestaurantSlug(slug) {
  return RESTAURANT_SLUG_REGEX.test(slug);
}

export function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function parseTableCount(value) {
  const parsedValue = Number.parseInt(String(value || ""), 10);

  if (!Number.isInteger(parsedValue)) {
    return NaN;
  }

  return parsedValue;
}

export function isValidTableCount(tableCount) {
  return Number.isInteger(tableCount) && tableCount >= MIN_TABLE_COUNT && tableCount <= MAX_TABLE_COUNT;
}

export function createTableCode(index) {
  return `T${String(index + 1).padStart(2, "0")}`;
}

export function createInitialTables(tableCount) {
  return Array.from({ length: tableCount }, (_, index) => {
    const code = createTableCode(index);

    return {
      code,
      label: `Table ${code}`,
    };
  });
}

export function createCustomerTablePath(restaurantSlug, tableCode) {
  return `/r/${restaurantSlug}/table/${tableCode}`;
}

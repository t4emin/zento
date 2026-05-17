import { UserRole } from "@prisma/client";

export const RESTAURANT_SLUG_REGEX = /^[a-z0-9-]+$/;
export const MIN_PASSWORD_LENGTH = 8;
export const MIN_TABLE_COUNT = 1;
export const MAX_TABLE_COUNT = 100;
export const DEFAULT_RESTAURANT_CURRENCY = "THB";
export const DEFAULT_RESTAURANT_TIMEZONE = "Asia/Bangkok";
export const DEFAULT_RESTAURANT_MODE = "normal";
export const DEFAULT_RESTAURANT_TYPE = "normal";
export const DEFAULT_BUFFET_DURATION_MINUTES = 90;
export const MIN_BUFFET_DURATION_MINUTES = 30;
export const MAX_BUFFET_DURATION_MINUTES = 240;
export const OWNER_ROLE = UserRole.owner;
export const RESTAURANT_MODES = ["normal", "buffet", "hybrid"];
export const RESTAURANT_TYPES = ["normal", "buffet"];
export const PAYMENT_STATUSES = ["unpaid", "pending_review", "paid"];

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

export function createCustomerSessionPath(restaurantSlug, sessionCode) {
  return `/r/${restaurantSlug}/session/${sessionCode}`;
}

export function normalizeOptionalNote(value, maxLength = 500) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue.slice(0, maxLength);
}

export function normalizeBuffetDurationMinutes(value) {
  if (value === null || value === undefined || value === "") {
    return DEFAULT_BUFFET_DURATION_MINUTES;
  }

  const parsedValue = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsedValue)) {
    return Number.NaN;
  }

  return parsedValue;
}

export function isValidBuffetDurationMinutes(value) {
  return (
    Number.isInteger(value) &&
    value >= MIN_BUFFET_DURATION_MINUTES &&
    value <= MAX_BUFFET_DURATION_MINUTES
  );
}

export function normalizeRestaurantType(value) {
  const normalizedValue = String(value || "").trim().toLowerCase();

  if (RESTAURANT_TYPES.includes(normalizedValue)) {
    return normalizedValue;
  }

  return DEFAULT_RESTAURANT_TYPE;
}

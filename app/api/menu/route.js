import { NextResponse } from "next/server";

import {
  apiSuccess,
  badRequest,
  logApiError,
  serverError,
} from "@/lib/api";
import { requirePermissionResponse } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  MENU_ITEM_WITH_OPTIONS_SELECT,
  normalizeOptionGroups,
  normalizeText,
  parseInteger,
  replaceMenuItemOptionGroups,
  serializeMenuItem,
  validateOptionGroups,
} from "@/lib/menu-options";
import prisma from "@/lib/prisma";

function normalizeMenuItemInput(payload) {
  const rawSortOrder =
    payload.sortOrder === null ||
    payload.sortOrder === undefined ||
    payload.sortOrder === ""
      ? null
      : parseInteger(payload.sortOrder);

  return {
    name: normalizeText(payload.name),
    description: normalizeText(payload.description),
    category: normalizeText(payload.category),
    price: parseInteger(payload.price),
    isAvailable:
      typeof payload.isAvailable === "boolean" ? payload.isAvailable : true,
    sortOrder: rawSortOrder,
    optionGroups: normalizeOptionGroups(payload.optionGroups),
  };
}

function validateMenuItemInput(normalizedItem) {
  if (!normalizedItem.name || !normalizedItem.category || !normalizedItem.description) {
    return "name, category, and description are required";
  }

  if (normalizedItem.name.length > 120) {
    return "name must be 120 characters or fewer";
  }

  if (normalizedItem.category.length > 60) {
    return "category must be 60 characters or fewer";
  }

  if (normalizedItem.description.length > 500) {
    return "description must be 500 characters or fewer";
  }

  if (!Number.isInteger(normalizedItem.price) || normalizedItem.price <= 0) {
    return "price must be a whole number greater than 0";
  }

  if (
    normalizedItem.sortOrder !== null &&
    (!Number.isInteger(normalizedItem.sortOrder) || normalizedItem.sortOrder < 0)
  ) {
    return "sortOrder must be null or a whole number greater than or equal to 0";
  }

  const optionGroupsError = validateOptionGroups(normalizedItem.optionGroups);

  if (optionGroupsError) {
    return optionGroupsError;
  }

  return null;
}

export async function GET(request) {
  const session = await requirePermissionResponse(PERMISSIONS.MENU_READ);

  if (session instanceof NextResponse) {
    return session;
  }

  const { searchParams } = new URL(request.url);
  const restaurantSlug = searchParams.get("restaurantSlug");
  const availableOnly = searchParams.get("availableOnly") === "true";

  if (restaurantSlug && restaurantSlug !== session.restaurant.slug) {
    return badRequest("restaurantSlug does not match the current session restaurant");
  }

  try {
    const restaurant = session.restaurant;

    const menuItems = await prisma.menuItem.findMany({
      where: {
        restaurantId: restaurant.id,
        ...(availableOnly ? { isAvailable: true } : {}),
      },
      orderBy: [
        { category: "asc" },
        { sortOrder: "asc" },
        { name: "asc" },
      ],
      select: {
        ...MENU_ITEM_WITH_OPTIONS_SELECT,
      },
    });

    return apiSuccess({
      restaurant,
      items: menuItems.map(serializeMenuItem),
    });
  } catch (error) {
    logApiError("GET /api/menu failed", error);
    return serverError("Failed to load menu items");
  }
}

export async function POST(request) {
  const session = await requirePermissionResponse(PERMISSIONS.MENU_WRITE);

  if (session instanceof NextResponse) {
    return session;
  }

  let payload;

  try {
    payload = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (payload.restaurantSlug && normalizeText(payload.restaurantSlug) !== session.restaurant.slug) {
    return badRequest("restaurantSlug does not match the current session restaurant");
  }

  const normalizedItem = normalizeMenuItemInput(payload);
  const validationError = validateMenuItemInput(normalizedItem);

  if (validationError) {
    return badRequest(validationError);
  }

  try {
    const restaurant = session.restaurant;

    const createdItem = await prisma.$transaction(async (tx) => {
      const createdMenuItem = await tx.menuItem.create({
        data: {
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          restaurantId: restaurant.id,
          name: normalizedItem.name,
          description: normalizedItem.description,
          category: normalizedItem.category,
          price: normalizedItem.price,
          isAvailable: normalizedItem.isAvailable,
          sortOrder: normalizedItem.sortOrder,
        },
      });

      await replaceMenuItemOptionGroups(
        tx,
        restaurant.id,
        createdMenuItem.id,
        normalizedItem.optionGroups
      );

      return tx.menuItem.findUnique({
        where: { id: createdMenuItem.id },
        select: MENU_ITEM_WITH_OPTIONS_SELECT,
      });
    });

    return apiSuccess(
      {
        restaurant,
        item: serializeMenuItem(createdItem),
      },
      201
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("POST /api/menu payload", payload);
      console.error("POST /api/menu normalizedItem", normalizedItem);
      console.error("POST /api/menu error detail", error);
    }

    logApiError("POST /api/menu failed", error);
    return serverError(
      process.env.NODE_ENV !== "production" && error instanceof Error
        ? `Failed to create menu item: ${error.message}`
        : "Failed to create menu item"
    );
  }
}

import { NextResponse } from "next/server";

import {
  apiSuccess,
  badRequest,
  logApiError,
  notFound,
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
    restaurantSlug: normalizeText(payload.restaurantSlug),
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

export async function PATCH(request, { params }) {
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

  const { id } = await params;
  const normalizedItem = normalizeMenuItemInput(payload);

  if (
    normalizedItem.restaurantSlug &&
    normalizedItem.restaurantSlug !== session.restaurant.slug
  ) {
    return badRequest("restaurantSlug does not match the current session restaurant");
  }

  const validationError = validateMenuItemInput(normalizedItem);

  if (validationError) {
    return badRequest(validationError);
  }

  try {
    const restaurant = session.restaurant;

    const existingItem = await prisma.menuItem.findFirst({
      where: {
        id,
        restaurantId: restaurant.id,
      },
      select: { id: true },
    });

    if (!existingItem) {
      return notFound("Menu item not found");
    }

    const updatedItem = await prisma.$transaction(async (tx) => {
      await tx.menuItem.update({
        where: { id },
        data: {
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
        id,
        normalizedItem.optionGroups
      );

      return tx.menuItem.findUnique({
        where: { id },
        select: MENU_ITEM_WITH_OPTIONS_SELECT,
      });
    });

    return apiSuccess({
      restaurant,
      item: serializeMenuItem(updatedItem),
    });
  } catch (error) {
    logApiError("PATCH /api/menu/[id] failed", error);
    return serverError("Failed to update menu item");
  }
}

export async function DELETE(request, { params }) {
  const session = await requirePermissionResponse(PERMISSIONS.MENU_WRITE);

  if (session instanceof NextResponse) {
    return session;
  }

  const { searchParams } = new URL(request.url);
  const restaurantSlug = searchParams.get("restaurantSlug");
  const { id } = await params;

  if (restaurantSlug && restaurantSlug !== session.restaurant.slug) {
    return badRequest("restaurantSlug does not match the current session restaurant");
  }

  try {
    const restaurant = session.restaurant;

    const existingItem = await prisma.menuItem.findFirst({
      where: {
        id,
        restaurantId: restaurant.id,
      },
      select: { id: true },
    });

    if (!existingItem) {
      return notFound("Menu item not found");
    }

    await prisma.menuItem.delete({
      where: { id },
    });

    return apiSuccess({
      restaurant,
      deletedId: id,
    });
  } catch (error) {
    logApiError("DELETE /api/menu/[id] failed", error);
    return serverError("Failed to delete menu item");
  }
}

import {
  apiSuccess,
  badRequest,
  forbidden,
  logApiError,
  notFound,
  serverError,
} from "@/lib/api";
import { requireStaffSessionResponse } from "@/lib/auth";
import prisma from "@/lib/prisma";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseInteger(value) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return Number.NaN;
  }

  const trimmedValue = value.trim();

  if (!/^-?\d+$/.test(trimmedValue)) {
    return Number.NaN;
  }

  return Number.parseInt(trimmedValue, 10);
}

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

  return null;
}

export async function PATCH(request, { params }) {
  const session = await requireStaffSessionResponse();

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

  if (!normalizedItem.restaurantSlug) {
    return badRequest("restaurantSlug is required");
  }

  if (normalizedItem.restaurantSlug !== session.restaurant.slug) {
    return forbidden();
  }

  const validationError = validateMenuItemInput(normalizedItem);

  if (validationError) {
    return badRequest(validationError);
  }

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: normalizedItem.restaurantSlug },
      select: { id: true, slug: true, name: true },
    });

    if (!restaurant) {
      return notFound("Restaurant not found");
    }

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

    const updatedItem = await prisma.menuItem.update({
      where: { id },
      data: {
        name: normalizedItem.name,
        description: normalizedItem.description,
        category: normalizedItem.category,
        price: normalizedItem.price,
        isAvailable: normalizedItem.isAvailable,
        sortOrder: normalizedItem.sortOrder,
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        category: true,
        isAvailable: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return apiSuccess({
      restaurant,
      item: updatedItem,
    });
  } catch (error) {
    logApiError("PATCH /api/menu/[id] failed", error);
    return serverError("Failed to update menu item");
  }
}

export async function DELETE(request, { params }) {
  const session = await requireStaffSessionResponse();

  if (session instanceof NextResponse) {
    return session;
  }

  const { searchParams } = new URL(request.url);
  const restaurantSlug = searchParams.get("restaurantSlug");
  const { id } = await params;

  if (!restaurantSlug) {
    return badRequest("restaurantSlug is required");
  }

  if (restaurantSlug !== session.restaurant.slug) {
    return forbidden();
  }

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug },
      select: { id: true, slug: true, name: true },
    });

    if (!restaurant) {
      return notFound("Restaurant not found");
    }

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

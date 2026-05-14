import { NextResponse } from "next/server";

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

export async function GET(request) {
  const session = await requireStaffSessionResponse();

  if (session instanceof NextResponse) {
    return session;
  }

  const { searchParams } = new URL(request.url);
  const restaurantSlug = searchParams.get("restaurantSlug");
  const availableOnly = searchParams.get("availableOnly") === "true";

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
      items: menuItems,
    });
  } catch (error) {
    logApiError("GET /api/menu failed", error);
    return serverError("Failed to load menu items");
  }
}

export async function POST(request) {
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

  const restaurantSlug = payload.restaurantSlug;

  if (!restaurantSlug) {
    return badRequest("restaurantSlug is required");
  }

  if (restaurantSlug !== session.restaurant.slug) {
    return forbidden();
  }

  const normalizedItem = normalizeMenuItemInput(payload);
  const validationError = validateMenuItemInput(normalizedItem);

  if (validationError) {
    return badRequest(validationError);
  }

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug },
      select: { id: true, slug: true, name: true },
    });

    if (!restaurant) {
      return notFound("Restaurant not found");
    }

    const createdItem = await prisma.menuItem.create({
      data: {
        id: payload.id || `item-${Date.now()}`,
        restaurantId: restaurant.id,
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

    return apiSuccess(
      {
        restaurant,
        item: createdItem,
      },
      201
    );
  } catch (error) {
    logApiError("POST /api/menu failed", error);
    return serverError("Failed to create menu item");
  }
}

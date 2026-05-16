import { NextResponse } from "next/server";

import { apiSuccess, forbidden, logApiError, notFound, serverError } from "@/lib/api";
import { requireStaffSessionResponse } from "@/lib/auth";
import { createCustomerTablePath } from "@/lib/restaurants";
import prisma from "@/lib/prisma";

export async function GET(request) {
  const session = await requireStaffSessionResponse();

  if (session instanceof NextResponse) {
    return session;
  }

  const { searchParams } = new URL(request.url);
  const restaurantSlug = searchParams.get("restaurantSlug");
  const resolvedRestaurantSlug = restaurantSlug || session.restaurant.slug;

  if (restaurantSlug && restaurantSlug !== session.restaurant.slug) {
    return forbidden();
  }

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: resolvedRestaurantSlug },
      select: { id: true, slug: true, name: true },
    });

    if (!restaurant) {
      return notFound("Restaurant not found");
    }

    const tables = await prisma.table.findMany({
      where: {
        restaurantId: restaurant.id,
      },
      orderBy: [{ code: "asc" }],
      select: {
        id: true,
        code: true,
        label: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return apiSuccess({
      restaurant,
      tables: tables.map((table) => ({
        ...table,
        customerPath: createCustomerTablePath(restaurant.slug, table.code),
      })),
    });
  } catch (error) {
    logApiError("GET /api/tables failed", error);
    return serverError("Failed to load tables");
  }
}

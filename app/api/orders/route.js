import { NextResponse } from "next/server";

import { apiSuccess, badRequest, logApiError, serverError } from "@/lib/api";
import { requirePermissionResponse } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export async function GET(request) {
  const session = await requirePermissionResponse(PERMISSIONS.ORDERS_READ);

  if (session instanceof NextResponse) {
    return session;
  }

  const { searchParams } = new URL(request.url);
  const restaurantSlug = searchParams.get("restaurantSlug");
  if (restaurantSlug && restaurantSlug !== session.restaurant.slug) {
    return badRequest("restaurantSlug does not match the current session restaurant");
  }

  try {
    const restaurant = session.restaurant;

    const orders = await prisma.order.findMany({
      where: {
        restaurantId: restaurant.id,
      },
      orderBy: [{ createdAt: "desc" }],
      include: {
        table: {
          select: {
            id: true,
            code: true,
            label: true,
          },
        },
        orderSession: {
          select: {
            id: true,
            code: true,
            status: true,
          },
        },
        orderItems: {
          orderBy: [{ id: "asc" }],
          select: {
            id: true,
            menuItemId: true,
            itemNameSnapshot: true,
            unitPriceSnapshot: true,
            quantity: true,
            lineTotal: true,
            selectedOptionsSnapshot: true,
          },
        },
      },
    });

    return apiSuccess({
      restaurant,
      orders,
    });
  } catch (error) {
    logApiError("GET /api/orders failed", error);
    return serverError("Failed to load orders");
  }
}

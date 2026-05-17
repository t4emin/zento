import { NextResponse } from "next/server";

import { apiSuccess, badRequest, logApiError, serverError } from "@/lib/api";
import { requirePermissionResponse } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { expireOrderSessionIfNeeded } from "@/lib/order-sessions";
import { createCustomerSessionPath, createCustomerTablePath } from "@/lib/restaurants";
import prisma from "@/lib/prisma";

export async function GET(request) {
  const session = await requirePermissionResponse(PERMISSIONS.TABLES_READ);

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
    const settings = await prisma.restaurantSettings.findUnique({
      where: {
        restaurantId: restaurant.id,
      },
      select: {
        mode: true,
        currency: true,
        timezone: true,
      },
    });

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
        orderSessions: {
          where: {
            status: "active",
          },
          orderBy: [{ startedAt: "desc" }],
          take: 1,
          select: {
            id: true,
            code: true,
            status: true,
            customerCount: true,
            note: true,
            startedAt: true,
            expiresAt: true,
            closedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    const normalizedTables = await Promise.all(
      tables.map(async (table) => {
        const [candidateSession] = table.orderSessions;
        const activeSession = candidateSession
          ? await expireOrderSessionIfNeeded(prisma, candidateSession)
          : null;

        return {
          id: table.id,
          code: table.code,
          label: table.label,
          isActive: table.isActive,
          createdAt: table.createdAt,
          updatedAt: table.updatedAt,
          customerPath: createCustomerTablePath(restaurant.slug, table.code),
          activeSession:
            activeSession?.status === "active"
              ? {
                  ...activeSession,
                  customerPath: createCustomerSessionPath(restaurant.slug, activeSession.code),
                }
              : null,
        };
      })
    );

    return apiSuccess({
      restaurant,
      settings,
      tables: normalizedTables,
    });
  } catch (error) {
    logApiError("GET /api/tables failed", error);
    return serverError("Failed to load tables");
  }
}

import { NextResponse } from "next/server";

import { apiSuccess, badRequest, logApiError, serverError } from "@/lib/api";
import { requirePermissionResponse } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { RESTAURANT_MODES } from "@/lib/restaurants";

export async function GET() {
  const session = await requirePermissionResponse(PERMISSIONS.TABLES_READ);

  if (session instanceof NextResponse) {
    return session;
  }

  try {
    const settings = await prisma.restaurantSettings.findUnique({
      where: {
        restaurantId: session.user.restaurantId,
      },
      select: {
        id: true,
        restaurantId: true,
        currency: true,
        timezone: true,
        mode: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return apiSuccess({
      restaurant: session.restaurant,
      settings,
    });
  } catch (error) {
    logApiError("GET /api/settings failed", error);
    return serverError("Failed to load restaurant settings");
  }
}

export async function PATCH(request) {
  const session = await requirePermissionResponse(PERMISSIONS.TABLES_WRITE);

  if (session instanceof NextResponse) {
    return session;
  }

  let payload;

  try {
    payload = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const mode = typeof payload.mode === "string" ? payload.mode.trim() : "";

  if (!RESTAURANT_MODES.includes(mode)) {
    return badRequest("mode must be one of: normal, buffet, hybrid");
  }

  try {
    const settings = await prisma.restaurantSettings.upsert({
      where: {
        restaurantId: session.user.restaurantId,
      },
      update: {
        mode,
      },
      create: {
        restaurantId: session.user.restaurantId,
        currency: "THB",
        timezone: "Asia/Bangkok",
        mode,
      },
      select: {
        id: true,
        restaurantId: true,
        currency: true,
        timezone: true,
        mode: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return apiSuccess({
      restaurant: session.restaurant,
      settings,
    });
  } catch (error) {
    logApiError("PATCH /api/settings failed", error);
    return serverError("Failed to update restaurant settings");
  }
}

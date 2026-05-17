import { NextResponse } from "next/server";

import { apiSuccess, badRequest, logApiError, serverError } from "@/lib/api";
import { requirePermissionResponse } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import {
  DEFAULT_BUFFET_DURATION_MINUTES,
  isValidBuffetDurationMinutes,
  normalizeBuffetDurationMinutes,
} from "@/lib/restaurants";

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
        buffetDurationMinutes: true,
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

  const buffetDurationMinutes = normalizeBuffetDurationMinutes(payload.buffetDurationMinutes);

  if (!isValidBuffetDurationMinutes(buffetDurationMinutes)) {
    return badRequest("buffetDurationMinutes must be between 30 and 240");
  }

  try {
    const settings = await prisma.restaurantSettings.upsert({
      where: {
        restaurantId: session.user.restaurantId,
      },
      update: {
        buffetDurationMinutes,
      },
      create: {
        restaurantId: session.user.restaurantId,
        currency: "THB",
        timezone: "Asia/Bangkok",
        buffetDurationMinutes: buffetDurationMinutes || DEFAULT_BUFFET_DURATION_MINUTES,
      },
      select: {
        id: true,
        restaurantId: true,
        currency: true,
        timezone: true,
        buffetDurationMinutes: true,
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

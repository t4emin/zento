import { NextResponse } from "next/server";

import { apiSuccess, badRequest, logApiError, notFound, serverError } from "@/lib/api";
import { requirePermissionResponse } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  createOrderSessionCode,
  createSessionExpiryFromDuration,
  parseOptionalDate,
  parseOptionalInteger,
} from "@/lib/order-sessions";
import {
  createCustomerSessionPath,
  DEFAULT_BUFFET_DURATION_MINUTES,
} from "@/lib/restaurants";
import prisma from "@/lib/prisma";

function buildSessionResponse(session, restaurantSlug) {
  return {
    ...session,
    customerPath: createCustomerSessionPath(restaurantSlug, session.code),
  };
}

async function createUniqueSessionCode(tx) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = createOrderSessionCode();
    const existingSession = await tx.orderSession.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!existingSession) {
      return code;
    }
  }

  throw new Error("Unable to generate unique session code");
}

export async function POST(request, { params }) {
  const session = await requirePermissionResponse(PERMISSIONS.SESSIONS_WRITE);

  if (session instanceof NextResponse) {
    return session;
  }

  let payload = {};

  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const { tableCode } = await params;
  const customerCount = parseOptionalInteger(payload.customerCount);
  const note = typeof payload.note === "string" ? payload.note.trim() : "";
  const expiresAt = parseOptionalDate(payload.expiresAt);

  if (Number.isNaN(customerCount) || (customerCount !== null && customerCount < 1)) {
    return badRequest("customerCount must be a positive integer when provided");
  }

  if (payload.expiresAt && !expiresAt) {
    return badRequest("expiresAt must be a valid date when provided");
  }

  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    return badRequest("expiresAt must be in the future");
  }

  try {
    let settings = null;

    try {
      settings = await prisma.restaurantSettings.findUnique({
        where: {
          restaurantId: session.restaurant.id,
        },
        select: {
          buffetDurationMinutes: true,
        },
      });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("POST /api/tables/[tableCode]/sessions settings query failed", {
          restaurantId: session.restaurant.id,
          error,
        });
      }
    }

    const table = await prisma.table.findUnique({
      where: {
        restaurantId_code: {
          restaurantId: session.restaurant.id,
          code: tableCode,
        },
      },
      select: {
        id: true,
        restaurantId: true,
        code: true,
        label: true,
        isActive: true,
      },
    });

    if (!table) {
      return notFound("Table not found");
    }

    if (!table.isActive) {
      return badRequest("Table is inactive");
    }

    const createdSession = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const resolvedDurationMinutes =
        settings?.buffetDurationMinutes || DEFAULT_BUFFET_DURATION_MINUTES;
      const resolvedExpiresAt =
        expiresAt || createSessionExpiryFromDuration(resolvedDurationMinutes, now);

      await tx.orderSession.updateMany({
        where: {
          tableId: table.id,
          status: "active",
        },
        data: {
          status: "closed",
          closedAt: now,
        },
      });

      const code = await createUniqueSessionCode(tx);

      return tx.orderSession.create({
        data: {
          restaurantId: table.restaurantId,
          tableId: table.id,
          code,
          status: "active",
          customerCount,
          note: note || null,
          startedAt: now,
          expiresAt: resolvedExpiresAt,
        },
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
      });
    });

    return apiSuccess(
      {
        table,
        session: buildSessionResponse(createdSession, session.restaurant.slug),
      },
      201
    );
  } catch (error) {
    logApiError("POST /api/tables/[tableCode]/sessions failed", error);
    return serverError("Failed to create order session");
  }
}

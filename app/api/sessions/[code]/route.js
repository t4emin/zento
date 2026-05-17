import { NextResponse } from "next/server";

import { apiSuccess, badRequest, logApiError, notFound, serverError } from "@/lib/api";
import { requirePermissionResponse } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  expireOrderSessionIfNeeded,
  ORDER_SESSION_STATUS_ACTIVE,
  ORDER_SESSION_STATUS_CLOSED,
  ORDER_SESSION_STATUS_EXPIRED,
} from "@/lib/order-sessions";
import { createCustomerSessionPath } from "@/lib/restaurants";
import prisma from "@/lib/prisma";

function buildSessionResponse(session) {
  return {
    id: session.id,
    code: session.code,
    status: session.status,
    customerCount: session.customerCount,
    note: session.note,
    startedAt: session.startedAt,
    expiresAt: session.expiresAt,
    closedAt: session.closedAt,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    restaurant: session.restaurant,
    table: session.table,
    customerPath: createCustomerSessionPath(session.restaurant.slug, session.code),
  };
}

async function getScopedSession(sessionCode, restaurantId) {
  const orderSession = await prisma.orderSession.findUnique({
    where: { code: sessionCode },
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
      restaurant: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
      table: {
        select: {
          id: true,
          code: true,
          label: true,
          isActive: true,
        },
      },
    },
  });

  if (!orderSession || orderSession.restaurant.id !== restaurantId) {
    return null;
  }

  return orderSession;
}

export async function GET(_request, { params }) {
  const staffSession = await requirePermissionResponse(PERMISSIONS.TABLES_READ);

  if (staffSession instanceof NextResponse) {
    return staffSession;
  }

  const { code } = await params;

  try {
    const session = await getScopedSession(code, staffSession.restaurant.id);

    if (!session) {
      return notFound("Order session not found");
    }

    const normalizedSession = await expireOrderSessionIfNeeded(prisma, session);
    const reloadedSession =
      normalizedSession.status === session.status
        ? session
        : await getScopedSession(code, staffSession.restaurant.id);

    if (!reloadedSession) {
      return notFound("Order session not found");
    }

    return apiSuccess({
      session: buildSessionResponse(reloadedSession),
    });
  } catch (error) {
    logApiError("GET /api/sessions/[code] failed", error);
    return serverError("Failed to load order session");
  }
}

export async function PATCH(request, { params }) {
  const staffSession = await requirePermissionResponse(PERMISSIONS.SESSIONS_WRITE);

  if (staffSession instanceof NextResponse) {
    return staffSession;
  }

  let payload;

  try {
    payload = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const nextStatus = String(payload.status || "").trim().toLowerCase();

  if (![ORDER_SESSION_STATUS_CLOSED, ORDER_SESSION_STATUS_EXPIRED].includes(nextStatus)) {
    return badRequest("status must be closed or expired");
  }

  const { code } = await params;

  try {
    const session = await getScopedSession(code, staffSession.restaurant.id);

    if (!session) {
      return notFound("Order session not found");
    }

    const normalizedSession = await expireOrderSessionIfNeeded(prisma, session);
    const effectiveSession =
      normalizedSession.status === session.status
        ? session
        : await getScopedSession(code, staffSession.restaurant.id);

    if (!effectiveSession) {
      return notFound("Order session not found");
    }

    if (effectiveSession.status !== ORDER_SESSION_STATUS_ACTIVE) {
      return apiSuccess({
        session: buildSessionResponse(effectiveSession),
      });
    }

    const updatedSession = await prisma.orderSession.update({
      where: { id: effectiveSession.id },
      data: {
        status: nextStatus,
        closedAt: new Date(),
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
        restaurant: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
        table: {
          select: {
            id: true,
            code: true,
            label: true,
            isActive: true,
          },
        },
      },
    });

    return apiSuccess({
      session: buildSessionResponse(updatedSession),
    });
  } catch (error) {
    logApiError("PATCH /api/sessions/[code] failed", error);
    return serverError("Failed to update order session");
  }
}

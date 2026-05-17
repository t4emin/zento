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
import prisma from "@/lib/prisma";
import { PAYMENT_STATUSES } from "@/lib/restaurants";

const VALID_ORDER_STATUSES = ["new", "preparing", "served", "cancelled"];
const VALID_ORDER_TRANSITIONS = {
  new: ["preparing", "cancelled"],
  preparing: ["served", "cancelled"],
  served: [],
  cancelled: [],
};

export async function PATCH(request, { params }) {
  const session = await requirePermissionResponse(PERMISSIONS.ORDERS_WRITE);

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
  const status = typeof payload.status === "string" ? payload.status.trim() : "";
  const paymentStatus =
    typeof payload.paymentStatus === "string" ? payload.paymentStatus.trim() : "";

  if (!status && !paymentStatus) {
    return badRequest("status or paymentStatus is required");
  }

  if (status && !VALID_ORDER_STATUSES.includes(status)) {
    return badRequest("status must be one of: new, preparing, served, cancelled");
  }

  if (paymentStatus && !PAYMENT_STATUSES.includes(paymentStatus)) {
    return badRequest("paymentStatus must be one of: unpaid, pending_review, paid");
  }

  try {
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        restaurantId: true,
        status: true,
        paymentStatus: true,
      },
    });

    if (!existingOrder) {
      return notFound("Order not found");
    }

    if (existingOrder.restaurantId !== session.user.restaurantId) {
      return notFound("Order not found");
    }

    if (status && status !== existingOrder.status) {
      const nextAllowedStatuses = VALID_ORDER_TRANSITIONS[existingOrder.status] || [];

      if (!nextAllowedStatuses.includes(status)) {
        return badRequest(
          `invalid status transition from ${existingOrder.status} to ${status}`
        );
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
      },
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
      order: updatedOrder,
    });
  } catch (error) {
    logApiError("PATCH /api/orders/[id] failed", error);
    return serverError("Failed to update order status");
  }
}

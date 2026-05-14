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

const VALID_ORDER_STATUSES = ["new", "preparing", "served", "cancelled"];
const VALID_ORDER_TRANSITIONS = {
  new: ["preparing", "cancelled"],
  preparing: ["served", "cancelled"],
  served: [],
  cancelled: [],
};

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
  const status = typeof payload.status === "string" ? payload.status.trim() : "";

  if (!VALID_ORDER_STATUSES.includes(status)) {
    return badRequest("status must be one of: new, preparing, served, cancelled");
  }

  try {
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        restaurantId: true,
        status: true,
      },
    });

    if (!existingOrder) {
      return notFound("Order not found");
    }

    if (existingOrder.restaurantId !== session.user.restaurantId) {
      return forbidden();
    }

    if (status !== existingOrder.status) {
      const nextAllowedStatuses = VALID_ORDER_TRANSITIONS[existingOrder.status] || [];

      if (!nextAllowedStatuses.includes(status)) {
        return badRequest(
          `invalid status transition from ${existingOrder.status} to ${status}`
        );
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        table: {
          select: {
            id: true,
            code: true,
            label: true,
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

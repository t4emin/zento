import { apiSuccess, badRequest, logApiError, notFound, serverError } from "@/lib/api";
import {
  buildValidatedOrderItems,
  MENU_ITEM_WITH_OPTIONS_SELECT,
  normalizeSubmittedOrderItems,
  serializeMenuItem,
  validateSubmittedOrderItems,
} from "@/lib/menu-options";
import prisma from "@/lib/prisma";
import { normalizeOptionalNote } from "@/lib/restaurants";

export async function POST(request, { params }) {
  let payload;

  try {
    payload = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const { slug, code } = await params;
  const items = normalizeSubmittedOrderItems(payload);
  const note = normalizeOptionalNote(payload.note, 500);
  const orderItemsError = validateSubmittedOrderItems(items);

  if (orderItemsError) {
    return badRequest(orderItemsError);
  }

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true },
    });

    if (!restaurant) {
      return notFound("Restaurant not found");
    }

    const table = await prisma.table.findUnique({
      where: {
        restaurantId_code: {
          restaurantId: restaurant.id,
          code,
        },
      },
      select: {
        id: true,
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

    const requestedIds = [...new Set(items.map((item) => item.id))];
    const menuItems = await prisma.menuItem.findMany({
      where: {
        restaurantId: restaurant.id,
        id: { in: requestedIds },
      },
      select: MENU_ITEM_WITH_OPTIONS_SELECT,
    });

    const validationResult = buildValidatedOrderItems(
      items,
      menuItems.map(serializeMenuItem)
    );

    if (validationResult.error) {
      return badRequest(validationResult.error);
    }

    const createdOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          id: `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          restaurantId: restaurant.id,
          tableId: table.id,
          note,
          paymentStatus: "unpaid",
          status: "new",
          totalAmount: validationResult.totalAmount,
          source: "qr",
        },
      });

      await tx.orderItem.createMany({
        data: validationResult.items.map((item) => ({
          orderId: order.id,
          menuItemId: item.menuItemId,
          itemNameSnapshot: item.itemNameSnapshot,
          unitPriceSnapshot: item.unitPriceSnapshot,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
          selectedOptionsSnapshot: item.selectedOptionsSnapshot,
        })),
      });

      return tx.order.findUnique({
        where: { id: order.id },
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
    });

    return apiSuccess(
      {
        restaurant,
        table: {
          id: table.id,
          code: table.code,
          label: table.label,
        },
        order: createdOrder,
      },
      201
    );
  } catch (error) {
    logApiError("POST /api/public/restaurants/[slug]/tables/[code]/orders failed", error);
    return serverError("Failed to create order");
  }
}

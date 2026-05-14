import { apiSuccess, badRequest, logApiError, notFound, serverError } from "@/lib/api";
import prisma from "@/lib/prisma";

function parseInteger(value) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return Number.NaN;
  }

  const trimmedValue = value.trim();

  if (!/^-?\d+$/.test(trimmedValue)) {
    return Number.NaN;
  }

  return Number.parseInt(trimmedValue, 10);
}

function normalizeOrderItems(payload) {
  if (!Array.isArray(payload.items)) {
    return null;
  }

  return payload.items.map((item) => ({
    id: String(item.id || "").trim(),
    quantity: parseInteger(item.quantity),
  }));
}

export async function POST(request, { params }) {
  let payload;

  try {
    payload = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const { slug, code } = await params;
  const items = normalizeOrderItems(payload);

  if (!items || items.length === 0) {
    return badRequest("items must be a non-empty array");
  }

  if (
    items.some(
      (item) => !item.id || Number.isNaN(item.quantity) || item.quantity <= 0 || !Number.isInteger(item.quantity)
    )
  ) {
    return badRequest("each order item must include a valid id and integer quantity greater than 0");
  }

  if (new Set(items.map((item) => item.id)).size !== items.length) {
    return badRequest("duplicate menu item ids are not allowed in one order payload");
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
      select: {
        id: true,
        name: true,
        price: true,
        isAvailable: true,
      },
    });

    const menuItemMap = new Map(menuItems.map((item) => [item.id, item]));

    for (const item of items) {
      const menuItem = menuItemMap.get(item.id);

      if (!menuItem) {
        return badRequest(`Menu item not found: ${item.id}`);
      }

      if (!menuItem.isAvailable) {
        return badRequest(`Menu item is unavailable: ${menuItem.name}`);
      }
    }

    const orderItemsData = items.map((item) => {
      const menuItem = menuItemMap.get(item.id);
      const lineTotal = menuItem.price * item.quantity;

      return {
        menuItemId: menuItem.id,
        itemNameSnapshot: menuItem.name,
        unitPriceSnapshot: menuItem.price,
        quantity: item.quantity,
        lineTotal,
      };
    });

    const totalAmount = orderItemsData.reduce(
      (sum, item) => sum + item.lineTotal,
      0
    );

    const createdOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          id: `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          restaurantId: restaurant.id,
          tableId: table.id,
          status: "new",
          totalAmount,
          source: "qr",
        },
      });

      await tx.orderItem.createMany({
        data: orderItemsData.map((item) => ({
          orderId: order.id,
          menuItemId: item.menuItemId,
          itemNameSnapshot: item.itemNameSnapshot,
          unitPriceSnapshot: item.unitPriceSnapshot,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
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

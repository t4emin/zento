import { apiSuccess, badRequest, logApiError, notFound, serverError } from "@/lib/api";
import {
  PUBLIC_MENU_ITEM_WITH_OPTIONS_SELECT,
  serializePublicMenuItem,
} from "@/lib/menu-options";
import { expireOrderSessionIfNeeded } from "@/lib/order-sessions";
import prisma from "@/lib/prisma";

export async function GET(_request, { params }) {
  const { slug, code } = await params;

  try {
    const session = await prisma.orderSession.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        status: true,
        customerCount: true,
        note: true,
        startedAt: true,
        expiresAt: true,
        closedAt: true,
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

    if (!session || session.restaurant.slug !== slug) {
      return notFound("Order session not found");
    }

    const normalizedSession = await expireOrderSessionIfNeeded(prisma, session);

    if (normalizedSession.status === "expired") {
      return badRequest("This ordering session has expired.");
    }

    if (normalizedSession.status !== "active") {
      return badRequest("This ordering session is closed.");
    }

    if (!session.table.isActive) {
      return badRequest("Table is inactive");
    }

    const menuItems = await prisma.menuItem.findMany({
      where: {
        restaurantId: session.restaurant.id,
        isAvailable: true,
      },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: PUBLIC_MENU_ITEM_WITH_OPTIONS_SELECT,
    });

    return apiSuccess({
      restaurant: session.restaurant,
      table: session.table,
      session: {
        id: session.id,
        code: session.code,
        status: normalizedSession.status,
        customerCount: session.customerCount,
        note: session.note,
        startedAt: session.startedAt,
        expiresAt: session.expiresAt,
        closedAt: normalizedSession.closedAt,
      },
      items: menuItems.map(serializePublicMenuItem).filter(Boolean),
    });
  } catch (error) {
    logApiError("GET /api/public/restaurants/[slug]/sessions/[code]/menu failed", error);
    return serverError("Failed to load session menu");
  }
}

import { apiSuccess, badRequest, logApiError, notFound, serverError } from "@/lib/api";
import prisma from "@/lib/prisma";

export async function GET(_request, { params }) {
  const { slug, code } = await params;

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

    const menuItems = await prisma.menuItem.findMany({
      where: {
        restaurantId: restaurant.id,
        isAvailable: true,
      },
      orderBy: [
        { category: "asc" },
        { sortOrder: "asc" },
        { name: "asc" },
      ],
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        category: true,
        isAvailable: true,
        sortOrder: true,
      },
    });

    return apiSuccess({
      restaurant,
      table,
      items: menuItems,
    });
  } catch (error) {
    logApiError("GET /api/public/restaurants/[slug]/tables/[code]/menu failed", error);
    return serverError("Failed to load public menu");
  }
}

import { apiSuccess, badRequest, forbidden, logApiError, notFound, serverError } from "@/lib/api";
import { requireStaffSessionResponse } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request) {
  const session = await requireStaffSessionResponse();

  if (session instanceof NextResponse) {
    return session;
  }

  const { searchParams } = new URL(request.url);
  const restaurantSlug = searchParams.get("restaurantSlug");

  if (!restaurantSlug) {
    return badRequest("restaurantSlug is required");
  }

  if (restaurantSlug !== session.restaurant.slug) {
    return forbidden();
  }

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug },
      select: { id: true, slug: true, name: true },
    });

    if (!restaurant) {
      return notFound("Restaurant not found");
    }

    const orders = await prisma.order.findMany({
      where: {
        restaurantId: restaurant.id,
      },
      orderBy: [{ createdAt: "desc" }],
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
      restaurant,
      orders,
    });
  } catch (error) {
    logApiError("GET /api/orders failed", error);
    return serverError("Failed to load orders");
  }
}

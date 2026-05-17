import { apiSuccess, logApiError, serverError } from "@/lib/api";
import { getStaffSession } from "@/lib/auth";
import { getRolePermissions } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await getStaffSession();

    if (!session) {
      return apiSuccess({
        authenticated: false,
        session: null,
      });
    }

    return apiSuccess({
      authenticated: true,
      session: {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role,
          restaurantId: session.user.restaurantId,
          permissions: getRolePermissions(session.user.role),
        },
        restaurant: session.restaurant,
      },
    });
  } catch (error) {
    logApiError("GET /api/auth/session failed", error);
    return serverError("Unable to load session");
  }
}

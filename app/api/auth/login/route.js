import { badRequest, logApiError, serverError, unauthorized } from "@/lib/api";
import { createSessionResponse, verifyPassword } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request) {
  let payload;

  try {
    payload = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");

  if (!email || !password) {
    return badRequest("email and password are required");
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        restaurantId: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
        restaurant: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return unauthorized("Invalid email or password");
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      return unauthorized("Invalid email or password");
    }

    return createSessionResponse(user, {
      session: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        restaurant: user.restaurant,
      },
    });
  } catch (error) {
    logApiError("POST /api/auth/login failed", error);
    return serverError("Unable to login");
  }
}

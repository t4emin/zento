import { Prisma } from "@prisma/client";

import { badRequest, logApiError, serverError } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  createInitialTables,
  DEFAULT_RESTAURANT_CURRENCY,
  DEFAULT_RESTAURANT_MODE,
  DEFAULT_RESTAURANT_TIMEZONE,
  isValidRestaurantSlug,
  isValidTableCount,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  normalizeRestaurantSlug,
  OWNER_ROLE,
  parseTableCount,
} from "@/lib/restaurants";

function validatePayload(payload) {
  const restaurantName = String(payload.restaurantName || "").trim();
  const restaurantSlug = normalizeRestaurantSlug(payload.restaurantSlug);
  const ownerName = String(payload.ownerName || "").trim();
  const ownerEmail = normalizeEmail(payload.ownerEmail);
  const password = String(payload.password || "");
  const tableCount = parseTableCount(payload.tableCount);

  if (!restaurantName) {
    return { error: "restaurant name is required" };
  }

  if (!restaurantSlug) {
    return { error: "restaurant slug is required" };
  }

  if (!isValidRestaurantSlug(restaurantSlug)) {
    return { error: "restaurant slug must use lowercase letters, numbers, and hyphens only" };
  }

  if (!ownerName) {
    return { error: "owner name is required" };
  }

  if (!ownerEmail) {
    return { error: "owner email is required" };
  }

  if (!password) {
    return { error: "password is required" };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }

  if (!isValidTableCount(tableCount)) {
    return { error: "table count must be between 1 and 100" };
  }

  return {
    values: {
      restaurantName,
      restaurantSlug,
      ownerName,
      ownerEmail,
      password,
      tableCount,
    },
  };
}

export async function POST(request) {
  let payload;

  try {
    payload = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const validation = validatePayload(payload);

  if (validation.error) {
    return badRequest(validation.error);
  }

  const { restaurantName, restaurantSlug, ownerName, ownerEmail, password, tableCount } =
    validation.values;

  try {
    const [existingRestaurant, existingUser] = await Promise.all([
      prisma.restaurant.findUnique({
        where: { slug: restaurantSlug },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { email: ownerEmail },
        select: { id: true },
      }),
    ]);

    if (existingRestaurant) {
      return badRequest("restaurant slug is already in use");
    }

    if (existingUser) {
      return badRequest("owner email is already in use");
    }

    const passwordHash = await hashPassword(password);
    const initialTables = createInitialTables(tableCount);

    const result = await prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          slug: restaurantSlug,
          name: restaurantName,
        },
        select: {
          id: true,
          slug: true,
          name: true,
        },
      });

      const owner = await tx.user.create({
        data: {
          restaurantId: restaurant.id,
          email: ownerEmail,
          name: ownerName,
          role: OWNER_ROLE,
          passwordHash,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });

      await tx.table.createMany({
        data: initialTables.map((table) => ({
          restaurantId: restaurant.id,
          code: table.code,
          label: table.label,
        })),
      });

      await tx.restaurantSettings.create({
        data: {
          restaurantId: restaurant.id,
          currency: DEFAULT_RESTAURANT_CURRENCY,
          timezone: DEFAULT_RESTAURANT_TIMEZONE,
          mode: DEFAULT_RESTAURANT_MODE,
        },
      });

      return {
        restaurant,
        owner,
      };
    });

    return Response.json(
      {
        ok: true,
        message: "Signup completed successfully",
        restaurant: result.restaurant,
        owner: result.owner,
        tableCount,
        redirectTo: `/login?registered=1&email=${encodeURIComponent(ownerEmail)}`,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return badRequest("restaurant slug or owner email is already in use");
    }

    logApiError("POST /api/auth/signup failed", error);
    return serverError("Unable to complete signup");
  }
}

import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";

import { apiSuccess, badRequest, logApiError, serverError } from "@/lib/api";
import { hashPassword, requirePermissionResponse } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { normalizeEmail } from "@/lib/restaurants";

const VALID_ROLES = Object.values(UserRole);

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validateRole(role) {
  return VALID_ROLES.includes(role);
}

export async function GET() {
  const session = await requirePermissionResponse(PERMISSIONS.STAFF_READ);

  if (session instanceof NextResponse) {
    return session;
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        restaurantId: session.user.restaurantId,
      },
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return apiSuccess({
      restaurant: session.restaurant,
      users,
    });
  } catch (error) {
    logApiError("GET /api/staff failed", error);
    return serverError("Failed to load staff");
  }
}

export async function POST(request) {
  const session = await requirePermissionResponse(PERMISSIONS.STAFF_WRITE);

  if (session instanceof NextResponse) {
    return session;
  }

  let payload;

  try {
    payload = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const email = normalizeEmail(payload.email);
  const name = normalizeText(payload.name);
  const role = normalizeText(payload.role);
  const password = String(payload.password || "");

  if (!email || !name || !role || !password) {
    return badRequest("email, name, role, and password are required");
  }

  if (!validateRole(role)) {
    return badRequest("role must be owner, manager, or staff");
  }

  if (password.length < 8) {
    return badRequest("password must be at least 8 characters");
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return badRequest("email is already in use");
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        restaurantId: session.user.restaurantId,
        email,
        name,
        role,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return apiSuccess(
      {
        restaurant: session.restaurant,
        user,
      },
      201
    );
  } catch (error) {
    logApiError("POST /api/staff failed", error);
    return serverError("Failed to create staff user");
  }
}

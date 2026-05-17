import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";

import { apiSuccess, badRequest, logApiError, notFound, serverError } from "@/lib/api";
import { hashPassword, requirePermissionResponse } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import prisma from "@/lib/prisma";

const VALID_ROLES = Object.values(UserRole);

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validateRole(role) {
  return VALID_ROLES.includes(role);
}

export async function PATCH(request, { params }) {
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

  const { id } = await params;
  const name = normalizeText(payload.name);
  const role = normalizeText(payload.role);
  const password = String(payload.password || "");

  if (!name && !role && !password) {
    return badRequest("at least one of name, role, or password is required");
  }

  if (role && !validateRole(role)) {
    return badRequest("role must be owner, manager, or staff");
  }

  if (password && password.length < 8) {
    return badRequest("password must be at least 8 characters");
  }

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        restaurantId: session.user.restaurantId,
      },
      select: {
        id: true,
      },
    });

    if (!existingUser) {
      return notFound("Staff user not found");
    }

    const data = {};

    if (name) {
      data.name = name;
    }

    if (role) {
      data.role = role;
    }

    if (password) {
      data.passwordHash = await hashPassword(password);
    }

    const user = await prisma.user.update({
      where: { id },
      data,
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
      user,
    });
  } catch (error) {
    logApiError("PATCH /api/staff/[id] failed", error);
    return serverError("Failed to update staff user");
  }
}

export async function DELETE(_request, { params }) {
  const session = await requirePermissionResponse(PERMISSIONS.STAFF_WRITE);

  if (session instanceof NextResponse) {
    return session;
  }

  const { id } = await params;

  if (id === session.user.id) {
    return badRequest("owner cannot delete themselves");
  }

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        restaurantId: session.user.restaurantId,
      },
      select: {
        id: true,
      },
    });

    if (!existingUser) {
      return notFound("Staff user not found");
    }

    await prisma.user.delete({
      where: { id },
    });

    return apiSuccess({
      restaurant: session.restaurant,
      deletedId: id,
    });
  } catch (error) {
    logApiError("DELETE /api/staff/[id] failed", error);
    return serverError("Failed to delete staff user");
  }
}

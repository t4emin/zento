import bcrypt from "bcrypt";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { apiSuccess, forbidden, unauthorized } from "@/lib/api";
import { getSessionCookieDomain, getSessionSecret, isProductionEnvironment } from "@/lib/env";
import { can, getRolePermissions, PERMISSIONS } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "zento_staff_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

function encodeBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signValue(value) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function createSessionToken(payload) {
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signValue(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token) {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  const expectedSignature = signValue(encodedPayload);

  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload));

    if (!payload.exp || payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function buildSessionPayload(user) {
  return {
    userId: user.id,
    restaurantId: user.restaurantId,
    role: user.role,
    email: user.email,
    exp: Date.now() + SESSION_DURATION_SECONDS * 1000,
  };
}

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: isProductionEnvironment() ? "strict" : "lax",
    secure: isProductionEnvironment(),
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
    priority: "high",
    domain: getSessionCookieDomain(),
  };
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, passwordHash) {
  if (!passwordHash) {
    return false;
  }

  return bcrypt.compare(password, passwordHash);
}

export function createSessionResponse(user, body, status = 200) {
  const response = apiSuccess(body, status);
  const token = createSessionToken(buildSessionPayload(user));

  response.cookies.set(SESSION_COOKIE_NAME, token, getCookieOptions());
  return response;
}

export function clearSessionResponse(body = { success: true }, status = 200) {
  const response = apiSuccess(body, status);

  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...getCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}

export async function getStaffSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const payload = verifySessionToken(sessionToken);

  if (!payload?.userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      restaurantId: true,
      email: true,
      name: true,
      role: true,
      restaurant: {
        select: {
          id: true,
          slug: true,
          name: true,
          type: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  if (
    user.email !== payload.email ||
    user.restaurantId !== payload.restaurantId ||
    user.role !== payload.role
  ) {
    return null;
  }

  return {
    user,
    restaurant: user.restaurant,
    permissions: getRolePermissions(user.role),
  };
}

export async function requireSession() {
  return getStaffSession();
}

export async function requireStaffSessionResponse() {
  const session = await requireSession();

  if (!session) {
    return unauthorized();
  }

  return session;
}

export async function requirePermission(permission) {
  const session = await requireSession();

  if (!session) {
    return unauthorized();
  }

  if (!can(session.user.role, permission)) {
    return forbidden("You do not have permission to perform this action");
  }

  return session;
}

export async function requirePermissionResponse(permission) {
  return requirePermission(permission);
}

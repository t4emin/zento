import { randomBytes } from "node:crypto";

export const ORDER_SESSION_STATUS_ACTIVE = "active";
export const ORDER_SESSION_STATUS_CLOSED = "closed";
export const ORDER_SESSION_STATUS_EXPIRED = "expired";

export function createOrderSessionCode() {
  let code = "";

  while (code.length < 10) {
    code += randomBytes(8).toString("base64url").replace(/[_-]/g, "").toUpperCase();
  }

  return code.slice(0, 10);
}

export function parseOptionalInteger(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number.parseInt(String(value), 10);
  return Number.isInteger(parsedValue) ? parsedValue : Number.NaN;
}

export function parseOptionalDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isOrderSessionExpired(session, now = new Date()) {
  if (!session?.expiresAt) {
    return false;
  }

  return new Date(session.expiresAt).getTime() <= now.getTime();
}

export function getResolvedOrderSessionStatus(session, now = new Date()) {
  if (!session) {
    return null;
  }

  if (session.status === ORDER_SESSION_STATUS_ACTIVE && isOrderSessionExpired(session, now)) {
    return ORDER_SESSION_STATUS_EXPIRED;
  }

  return session.status;
}

export async function expireOrderSessionIfNeeded(prismaClient, session, now = new Date()) {
  if (!session || session.status !== ORDER_SESSION_STATUS_ACTIVE || !isOrderSessionExpired(session, now)) {
    return session;
  }

  return prismaClient.orderSession.update({
    where: { id: session.id },
    data: {
      status: ORDER_SESSION_STATUS_EXPIRED,
      closedAt: session.closedAt || now,
    },
  });
}

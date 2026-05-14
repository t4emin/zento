import { NextResponse } from "next/server";

export function apiSuccess(payload = {}, status = 200) {
  return NextResponse.json(
    {
      ok: true,
      ...payload,
    },
    { status }
  );
}

export function apiError(status, code, message) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
      },
    },
    { status }
  );
}

export function badRequest(message) {
  return apiError(400, "BAD_REQUEST", message);
}

export function unauthorized(message = "Unauthorized") {
  return apiError(401, "UNAUTHORIZED", message);
}

export function forbidden(message = "Forbidden") {
  return apiError(403, "FORBIDDEN", message);
}

export function notFound(message = "Not found") {
  return apiError(404, "NOT_FOUND", message);
}

export function serverError(message = "Internal server error") {
  return apiError(500, "INTERNAL_SERVER_ERROR", message);
}

export function logApiError(context, error) {
  if (process.env.NODE_ENV === "production") {
    console.error(context, error instanceof Error ? error.message : "Unexpected error");
    return;
  }

  console.error(context, error);
}

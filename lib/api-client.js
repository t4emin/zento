export function getApiErrorMessage(payload, fallbackMessage) {
  if (typeof payload?.error === "string") {
    return payload.error;
  }

  if (typeof payload?.error?.message === "string") {
    return payload.error.message;
  }

  return fallbackMessage;
}

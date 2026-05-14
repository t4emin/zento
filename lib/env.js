const DEV_SESSION_SECRET = "zento-dev-session-secret-change-me";
const MIN_SESSION_SECRET_LENGTH = 32;

function readEnvValue(name) {
  const value = process.env[name];

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export function isProductionEnvironment() {
  return process.env.NODE_ENV === "production";
}

export function getRequiredServerEnv(name) {
  const value = readEnvValue(name);

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

export function getSessionSecret() {
  const configuredSecret = readEnvValue("SESSION_SECRET");

  if (!configuredSecret) {
    if (isProductionEnvironment()) {
      throw new Error("SESSION_SECRET is required in production");
    }

    return DEV_SESSION_SECRET;
  }

  if (configuredSecret.length < MIN_SESSION_SECRET_LENGTH) {
    throw new Error(
      `SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters long`
    );
  }

  if (isProductionEnvironment() && configuredSecret === DEV_SESSION_SECRET) {
    throw new Error("SESSION_SECRET must not use the development fallback value");
  }

  return configuredSecret;
}

export function getSessionCookieDomain() {
  const domain = readEnvValue("SESSION_COOKIE_DOMAIN");

  return domain || undefined;
}

export function getValidatedProductionEnvSummary() {
  return {
    databaseUrl: getRequiredServerEnv("DATABASE_URL"),
    sessionSecret: getSessionSecret(),
    sessionCookieDomain: getSessionCookieDomain(),
  };
}

const MIN_SESSION_SECRET_LENGTH = 32;

function getEnv(name) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function fail(message) {
  console.error(`Env validation failed: ${message}`);
  process.exit(1);
}

function main() {
  const databaseUrl = getEnv("DATABASE_URL");
  const sessionSecret = getEnv("SESSION_SECRET");

  if (!databaseUrl) {
    fail("DATABASE_URL is required");
  }

  if (!sessionSecret) {
    fail("SESSION_SECRET is required");
  }

  if (sessionSecret.length < MIN_SESSION_SECRET_LENGTH) {
    fail(`SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters long`);
  }

  console.log("Environment validation passed.");
}

main();

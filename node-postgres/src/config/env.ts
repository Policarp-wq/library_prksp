import "dotenv/config";

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value && value.length > 0) {
    return value;
  }
  if (isProduction) {
    throw new Error(
      `Environment variable ${name} is required in production. Refusing to start with an insecure default.`,
    );
  }
  const devFallback = name === "JWT_SECRET" ? "dev-only-insecure-jwt-secret" : "dev-only-insecure-password";
  console.warn(
    `[env] ${name} is not set, using insecure development fallback. Set ${name} in your environment before production use.`,
  );
  return devFallback;
}

export const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv,
  isProduction,
  jwtSecret: requireEnv("JWT_SECRET"),
  pg: {
    user: process.env.PGUSER || "postgres",
    host: process.env.PGHOST || "localhost",
    database: process.env.PGDATABASE || "books_db",
    password: requireEnv("PGPASSWORD"),
    port: Number(process.env.PGPORT) || 5432,
  },
  seed: {
    demoUsers: process.env.SEED_DEMO_USERS === "true",
    adminUsername: process.env.SEED_ADMIN_USERNAME || "admin",
    adminPassword: process.env.SEED_ADMIN_PASSWORD || "",
    userUsername: process.env.SEED_USER_USERNAME || "user",
    userPassword: process.env.SEED_USER_PASSWORD || "",
  },
} as const;

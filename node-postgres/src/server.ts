import type { Server } from "http";
import { app } from "./app";
import { pool } from "./config/db";
import { env } from "./config/env";
import { ALLOWED_ROLES } from "./middlewares/authenticate";
import {
  isNonEmptyTrimmedString,
  isValidPassword,
  isValidUsername,
  parsePositiveIntId,
  validateBookPayload,
  validateLoanPayload,
} from "./validators/legacy";

const SHUTDOWN_GRACE_MS = 10_000;

function registerShutdown(server: Server): void {
  let shuttingDown = false;

  const shutdown = (signal: string): void => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.log(`${signal} received, shutting down...`);

    const force = setTimeout(() => {
      console.error("Graceful shutdown timed out, forcing exit.");
      process.exit(1);
    }, SHUTDOWN_GRACE_MS);
    force.unref();

    server.close((closeErr) => {
      pool
        .end()
        .catch((poolErr) => console.error("Error closing pg pool:", poolErr))
        .finally(() => {
          if (closeErr) {
            console.error("Error closing HTTP server:", closeErr);
            process.exit(1);
          }
          process.exit(0);
        });
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

if (env.nodeEnv !== "test") {
  const server = app.listen(env.port, () => {
    console.log(`Server listening on http://localhost:${env.port}`);
  });
  registerShutdown(server);
}

export {
  ALLOWED_ROLES,
  app,
  isNonEmptyTrimmedString,
  isValidPassword,
  isValidUsername,
  parsePositiveIntId,
  validateBookPayload,
  validateLoanPayload,
};

import { app } from "./app";
import { env } from "./config/env";
import { initDb } from "./db/init";
import { ALLOWED_ROLES } from "./middlewares/authenticate";
import {
  isNonEmptyTrimmedString,
  isValidPassword,
  isValidUsername,
  parsePositiveIntId,
  validateBookPayload,
  validateLoanPayload,
} from "./validators/legacy";

if (env.nodeEnv !== "test") {
  initDb();
}

if (env.nodeEnv !== "test") {
  app.listen(env.port, () => {
    console.log(`Сервер запущен на http://localhost:${env.port}`);
  });
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

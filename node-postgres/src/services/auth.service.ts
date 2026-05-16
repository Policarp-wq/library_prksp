import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { HttpError } from "../errors/HttpError";
import { ALLOWED_ROLES } from "../middlewares/authenticate";
import { userRepository } from "../repositories/user.repository";
import { isValidPassword, isValidUsername } from "../validators/legacy";

const TOKEN_TTL = "24h";
const BCRYPT_ROUNDS = 10;
const PG_UNIQUE_VIOLATION = "23505";

export interface AuthResult {
  token: string;
  user: { id: number; username: string; role: "admin" | "user" };
}

function issueToken(user: AuthResult["user"]): string {
  return jwt.sign(user, env.jwtSecret, { expiresIn: TOKEN_TTL });
}

export const authService = {
  async register(input: {
    username: unknown;
    password: unknown;
    role: unknown;
  }): Promise<AuthResult> {
    if (!isValidUsername(input.username)) {
      throw HttpError.badRequest("Invalid username");
    }
    if (!isValidPassword(input.password)) {
      throw HttpError.badRequest("Invalid password");
    }
    if (input.role !== undefined && !ALLOWED_ROLES.has(input.role as string)) {
      throw HttpError.badRequest("Invalid role");
    }
    if (input.role === "admin") {
      throw HttpError.forbidden("Self-registration as admin is forbidden");
    }

    const username = (input.username as string).trim();
    const password = (input.password as string).trim();
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    try {
      const created = await userRepository.create(username, passwordHash, "user");
      return { token: issueToken(created), user: created };
    } catch (err) {
      if ((err as { code?: string }).code === PG_UNIQUE_VIOLATION) {
        throw HttpError.badRequest("Username already exists");
      }
      throw err;
    }
  },

  async login(input: { username: unknown; password: unknown }): Promise<AuthResult> {
    if (!isValidUsername(input.username) || !isValidPassword(input.password)) {
      throw HttpError.badRequest("Invalid credentials payload");
    }

    const username = (input.username as string).trim();
    const password = (input.password as string).trim();

    const user = await userRepository.findByUsername(username);
    if (!user) {
      throw HttpError.unauthorized("Invalid credentials");
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw HttpError.unauthorized("Invalid credentials");
    }

    const userView = { id: user.id, username: user.username, role: user.role };
    return { token: issueToken(userView), user: userView };
  },
};

import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export const ALLOWED_ROLES = new Set(["admin", "user"]);

export interface AuthenticatedUser {
  id: number;
  username: string;
  role: "admin" | "user";
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthenticatedUser;
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "Access token required" });
    return;
  }

  jwt.verify(token, env.jwtSecret, (err, decoded) => {
    if (err || !decoded || typeof decoded !== "object") {
      res.status(403).json({ error: "Invalid token" });
      return;
    }

    const user = decoded as AuthenticatedUser;
    if (!user.role || !ALLOWED_ROLES.has(user.role)) {
      res.status(403).json({ error: "Invalid token role" });
      return;
    }

    req.user = user;
    next();
  });
}

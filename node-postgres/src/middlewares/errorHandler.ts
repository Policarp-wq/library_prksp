import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errors/HttpError";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: message });
}

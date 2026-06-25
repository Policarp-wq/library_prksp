import cors from "cors";
import express, { type Express } from "express";
import { pool } from "./config/db";
import { errorHandler } from "./middlewares/errorHandler";
import { apiRouter } from "./routes";

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/healthz", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/readyz", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.status(200).json({ status: "ready" });
    } catch (err) {
      res.status(503).json({ status: "not-ready", error: (err as Error).message });
    }
  });

  app.use("/api", apiRouter);

  app.use(errorHandler);

  return app;
}

export const app = createApp();

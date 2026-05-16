import { Router } from "express";
import { authRoutes } from "./auth.routes";
import { booksRoutes } from "./books.routes";
import { loansRoutes } from "./loans.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/books", booksRoutes);
apiRouter.use("/loans", loansRoutes);

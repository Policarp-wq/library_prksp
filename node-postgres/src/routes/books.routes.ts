import { Router } from "express";
import { booksController } from "../controllers/books.controller";
import { authenticate } from "../middlewares/authenticate";
import { requireAdmin } from "../middlewares/requireAdmin";

export const booksRoutes = Router();

booksRoutes.get("/", booksController.list);
booksRoutes.post("/", authenticate, requireAdmin, booksController.create);
booksRoutes.put("/:id", authenticate, requireAdmin, booksController.update);
booksRoutes.delete("/:id", authenticate, requireAdmin, booksController.remove);

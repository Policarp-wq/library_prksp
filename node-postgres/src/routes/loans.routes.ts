import { Router } from "express";
import { loansController } from "../controllers/loans.controller";
import { authenticate } from "../middlewares/authenticate";

export const loansRoutes = Router();

loansRoutes.post("/", authenticate, loansController.create);
loansRoutes.patch("/:id/return", authenticate, loansController.returnLoan);
loansRoutes.get("/", authenticate, loansController.list);

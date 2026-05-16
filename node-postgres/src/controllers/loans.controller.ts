import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errors/HttpError";
import { loanService } from "../services/loan.service";
import { parsePositiveIntId } from "../validators/legacy";

function requireUserId(req: Request): number {
  const id = parsePositiveIntId(req.user?.id);
  if (!id) throw HttpError.forbidden("Invalid token subject");
  return id;
}

export const loansController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = requireUserId(req);
      const loan = await loanService.create(userId, req.body);
      res.status(201).json(loan);
    } catch (err) {
      next(err);
    }
  },

  async returnLoan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const loanId = parsePositiveIntId(req.params.id);
      if (!loanId) throw HttpError.badRequest("Invalid id");

      const userId = requireUserId(req);
      const loan = await loanService.returnLoan(loanId, {
        id: userId,
        role: req.user!.role,
      });
      res.json(loan);
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = requireUserId(req);
      const loans = await loanService.list(
        { id: userId, role: req.user!.role },
        req.query,
      );
      res.json(loans);
    } catch (err) {
      next(err);
    }
  },
};

import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errors/HttpError";
import { bookService } from "../services/book.service";
import { parsePositiveIntId } from "../validators/legacy";

function requireId(value: unknown): number {
  const id = parsePositiveIntId(value);
  if (!id) throw HttpError.badRequest("Invalid id");
  return id;
}

export const booksController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = await bookService.list(req.query);
      res.json(page);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id;
      const book = await bookService.create(req.body, ownerId);
      res.status(201).json(book);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = requireId(req.params.id);
      const book = await bookService.update(id, req.body);
      res.json(book);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = requireId(req.params.id);
      await bookService.remove(id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
};

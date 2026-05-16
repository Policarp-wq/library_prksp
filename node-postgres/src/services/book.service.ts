import { HttpError } from "../errors/HttpError";
import {
  bookRepository,
  type BookListItem,
  type BookRecord,
} from "../repositories/book.repository";
import { loanRepository } from "../repositories/loan.repository";
import {
  validateBookPayload,
  validateBooksQueryValue,
  type NormalizedBook,
} from "../validators/legacy";

const PAGE_SIZE = 12;
const PG_FOREIGN_KEY_VIOLATION = "23503";

export interface BookListPage {
  books: BookListItem[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export interface BookListQuery {
  q?: unknown;
  title?: unknown;
  author?: unknown;
  page?: unknown;
}

function parsePage(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parsePayload(payload: unknown): NormalizedBook {
  const result = validateBookPayload(payload);
  if (!result.ok) {
    throw HttpError.badRequest(result.error);
  }
  return result.data;
}

export const bookService = {
  async list(query: BookListQuery): Promise<BookListPage> {
    const qResult = validateBooksQueryValue(query.q, "q");
    if (!qResult.ok) throw HttpError.badRequest(qResult.error);

    const titleResult = validateBooksQueryValue(query.title, "title");
    if (!titleResult.ok) throw HttpError.badRequest(titleResult.error);

    const authorResult = validateBooksQueryValue(query.author, "author");
    if (!authorResult.ok) throw HttpError.badRequest(authorResult.error);

    const page = parsePage(query.page);

    const { rows, total } = await bookRepository.list({
      q: qResult.data,
      title: titleResult.data,
      author: authorResult.data,
      page,
      limit: PAGE_SIZE,
    });

    return {
      books: rows,
      total,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE) || 1,
      limit: PAGE_SIZE,
    };
  },

  async create(payload: unknown, ownerId: number): Promise<BookRecord> {
    const data = parsePayload(payload);
    return bookRepository.create({ ...data, ownerId: String(ownerId) });
  },

  async update(id: number, payload: unknown): Promise<BookRecord> {
    const data = parsePayload(payload);
    const updated = await bookRepository.update(id, {
      title: data.title,
      author: data.author,
      year: data.year,
      url: data.url,
    });
    if (!updated) throw HttpError.notFound("Not found");
    return updated;
  },

  async remove(id: number): Promise<void> {
    if (await loanRepository.hasActiveLoan(id)) {
      throw HttpError.conflict("Нельзя удалить: книга сейчас выдана");
    }

    try {
      const ok = await bookRepository.deleteById(id);
      if (!ok) throw HttpError.notFound("Not found");
    } catch (err) {
      if ((err as { code?: string }).code === PG_FOREIGN_KEY_VIOLATION) {
        throw HttpError.conflict("Нельзя удалить: книга сейчас выдана");
      }
      throw err;
    }
  },
};

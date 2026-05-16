import { HttpError } from "../errors/HttpError";
import { bookRepository } from "../repositories/book.repository";
import {
  loanRepository,
  type LoanListItem,
  type LoanRecord,
} from "../repositories/loan.repository";
import { validateLoanPayload } from "../validators/legacy";

export interface LoanListQuery {
  active?: unknown;
}

export const loanService = {
  async create(userId: number, payload: unknown): Promise<LoanRecord> {
    const result = validateLoanPayload(payload);
    if (!result.ok) throw HttpError.badRequest(result.error);

    const { bookId } = result.data;
    const book = await bookRepository.findById(bookId);
    if (!book) throw HttpError.notFound("Book not found");

    if (await loanRepository.hasActiveLoan(bookId)) {
      throw HttpError.conflict("Book is already loaned");
    }

    return loanRepository.create(userId, bookId);
  },

  async returnLoan(
    loanId: number,
    requester: { id: number; role: "admin" | "user" },
  ): Promise<LoanRecord> {
    const loan = await loanRepository.findById(loanId);
    if (!loan) throw HttpError.notFound("Loan not found");
    if (loan.returned_at) throw HttpError.conflict("Loan already returned");

    const isOwner = Number(loan.user_id) === requester.id;
    const isAdmin = requester.role === "admin";
    if (!isOwner && !isAdmin) throw HttpError.forbidden("Forbidden");

    return loanRepository.markReturned(loanId);
  },

  async list(
    requester: { id: number; role: "admin" | "user" },
    query: LoanListQuery,
  ): Promise<LoanListItem[]> {
    const { active } = query;
    if (active !== undefined && active !== "true" && active !== "false") {
      throw HttpError.badRequest("Invalid active filter");
    }

    const isAdmin = requester.role === "admin";
    return loanRepository.list({
      userId: isAdmin ? undefined : requester.id,
      activeOnly: active === "true",
    });
  },
};

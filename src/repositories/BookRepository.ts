import { Book } from '../models/Book'
import { store } from "../app/store";

interface BooksResponse {
  books: Array<{
    id: number;
    title: string;
    author: string;
    year: number;
    image: string | null;
    owner_id: string | null;
    available?: boolean;
    canDelete?: boolean;
    deleteReason?: string | null;
  }>;
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export interface LoanRecord {
  id: number;
  user_id: number;
  book_id: number;
  issued_at: string;
  returned_at: string | null;
  book_title?: string;
  book_author?: string;
  book_year?: number;
}

function getAuthHeaders(): Record<string, string> {
  const state = store.getState();
  const token = state.auth.accessToken;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export class BookRepository {
  async getAvailableBooks(
    query?: string,
    page: number = 1
  ): Promise<{
    books: Book[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams();
    if (query) params.append("q", query);
    params.append("page", page.toString());

    const res = await fetch(`/api/books?${params.toString()}`);
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Ошибка при загрузке каталога");
    }
    const data: BooksResponse = await res.json();

    return {
      books: data.books.map(
        (b) =>
          new Book(
            b.title,
            b.author,
            b.year,
            b.image ?? undefined,
            b.id,
            b.owner_id ?? undefined,
            b.available,
            b.canDelete,
            b.deleteReason ?? undefined
          )
      ),
      total: data.total,
      page: data.page,
      totalPages: data.totalPages,
    };
  }

  async addBook(book: Book): Promise<Book> {
    const headers = getAuthHeaders();

    const res = await fetch("/api/books", {
      method: "POST",
      headers,
      body: JSON.stringify(book),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Ошибка при добавлении книги");
    }

    return new Book(
      data.title,
      data.author,
      data.year,
      data.image,
      data.id,
      data.owner_id
    );
  }

  async editBook(id: number, book: Partial<Book>): Promise<void> {
    const headers = getAuthHeaders();

    const res = await fetch(`/api/books/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(book),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Ошибка при редактировании книги");
    }
  }

  async deleteBook(id: number): Promise<void> {
    const headers = getAuthHeaders();

    const res = await fetch(`/api/books/${id}`, { method: "DELETE", headers });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Ошибка при удалении книги");
    }
  }

  async borrowBook(bookId: number): Promise<LoanRecord> {
    const headers = getAuthHeaders();
    const res = await fetch("/api/loans", {
      method: "POST",
      headers,
      body: JSON.stringify({ bookId }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Ошибка при выдаче книги");
    }

    return data as LoanRecord;
  }

  async returnLoan(loanId: number): Promise<LoanRecord> {
    const headers = getAuthHeaders();
    const res = await fetch(`/api/loans/${loanId}/return`, {
      method: "PATCH",
      headers,
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Ошибка при возврате книги");
    }

    return data as LoanRecord;
  }

  async getLoans(activeOnly: boolean = false): Promise<LoanRecord[]> {
    const headers = getAuthHeaders();
    const params = new URLSearchParams();
    if (activeOnly) {
      params.append("active", "true");
    }
    const query = params.toString();
    const endpoint = query ? `/api/loans?${query}` : "/api/loans";

    const res = await fetch(endpoint, { headers });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Ошибка при загрузке выдач");
    }

    return data as LoanRecord[];
  }
}

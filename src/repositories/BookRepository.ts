import { Book } from '../models/Book'
import { store } from "../app/store";

interface BooksResponse {
  books: any[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
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
    search?: string,
    page: number = 1
  ): Promise<{
    books: Book[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    params.append("page", page.toString());

    const res = await fetch(`/api/books?${params.toString()}`);
    const data: BooksResponse = await res.json();

    return {
      books: data.books.map(
        (b: any) =>
          new Book(b.title, b.author, b.year, b.image, b.id, b.owner_id)
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
}

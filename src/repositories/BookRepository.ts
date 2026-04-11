import { Book } from '../models/Book'
import { store } from "../app/store";

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
  async getAvailableBooks(): Promise<Book[]> {
    const res = await fetch("/api/books");
    const data = await res.json();
    return data.map(
      (b: any) => new Book(b.title, b.author, b.year, b.image, b.id, b.owner_id)
    );
  }

  async addBook(book: Book): Promise<Book> {
    const headers = getAuthHeaders();

    const res = await fetch("/api/books", {
      method: "POST",
      headers,
      body: JSON.stringify(book),
    });
    const b = await res.json();
    return new Book(b.title, b.author, b.year, b.image, b.id, b.owner_id);
  }

  async editBook(id: number, book: Partial<Book>): Promise<void> {
    const headers = getAuthHeaders();

    await fetch(`/api/books/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(book),
    });
  }

  async deleteBook(id: number): Promise<void> {
    const headers = getAuthHeaders();

    await fetch(`/api/books/${id}`, { method: "DELETE", headers });
  }
}

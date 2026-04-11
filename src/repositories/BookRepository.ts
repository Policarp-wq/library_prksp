import { Book } from '../models/Book'

export class BookRepository {
  async getAvailableBooks(): Promise<Book[]> {
    const res = await fetch("/api/books");
    const data = await res.json();
    return data.map(
      (b: any) => new Book(b.title, b.author, b.year, b.image, b.id, b.owner_id)
    );
  }

  async addBook(book: Book, userId?: string): Promise<Book> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (userId) headers["x-user-id"] = userId;

    const res = await fetch("/api/books", {
      method: "POST",
      headers,
      body: JSON.stringify(book),
    });
    const b = await res.json();
    return new Book(b.title, b.author, b.year, b.image, b.id, b.owner_id);
  }

  async editBook(
    id: number,
    book: Partial<Book>,
    userId?: string,
    userRoles?: string[]
  ): Promise<void> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (userId) headers["x-user-id"] = userId;
    if (userRoles) headers["x-user-roles"] = userRoles.join(",");

    await fetch(`/api/books/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(book),
    });
  }

  async deleteBook(
    id: number,
    userId?: string,
    userRoles?: string[]
  ): Promise<void> {
    const headers: Record<string, string> = {};
    if (userId) headers["x-user-id"] = userId;
    if (userRoles) headers["x-user-roles"] = userRoles.join(",");

    await fetch(`/api/books/${id}`, { method: "DELETE", headers });
  }
}

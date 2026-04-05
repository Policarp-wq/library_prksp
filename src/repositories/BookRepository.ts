import { Book } from '../models/Book'

export class BookRepository {
  async getAvailableBooks(): Promise<Book[]> {
    const res = await fetch("/api/books");
    const data = await res.json();
    return data.map(
      (b: any) => new Book(b.title, b.author, b.year, b.image, b.id)
    );
  }

  async addBook(book: Book): Promise<Book> {
    const res = await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(book),
    });
    const b = await res.json();
    return new Book(b.title, b.author, b.year, b.image, b.id);
  }

  async deleteBook(id: number): Promise<void> {
    await fetch(`/api/books/${id}`, { method: "DELETE" });
  }
}

import { useEffect, useState } from "react";
import { BookRepository } from "../repositories/BookRepository";
import BookCard from "../components/BookCard";
import { Book } from "../models/Book";
import "./BooksPage.css";

const bookRepository = new BookRepository();

function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);

  // Состояния для формы
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [year, setYear] = useState("");

  const fetchBooks = async () => {
    const data = await bookRepository.getAvailableBooks();
    setBooks(data);
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author || !year) return;
    const newBook = new Book(title, author, parseInt(year));
    await bookRepository.addBook(newBook);
    fetchBooks();
    setTitle("");
    setAuthor("");
    setYear("");
  };

  const handleDeleteBook = async (id?: number) => {
    if (id) {
      await bookRepository.deleteBook(id);
      fetchBooks();
    }
  };

  return (
    <div className="books-page">
      <h1>Каталог доступных книг</h1>

      <form
        onSubmit={handleAddBook}
        className="add-book-form"
        style={{
          marginBottom: "20px",
          padding: "15px",
          border: "1px solid #ccc",
          borderRadius: "8px",
        }}
      >
        <h3>Добавить новую книгу</h3>
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <input
            placeholder="Название"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <input
            placeholder="Автор"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required
          />
          <input
            type="number"
            placeholder="Год"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            required
          />
          <button type="submit">Добавить</button>
        </div>
      </form>

      <ul className="books-list">
        {books.map((book) => (
          <li
            key={book.id}
            className="books-list__item"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <BookCard book={book} />
            <button
              onClick={() => handleDeleteBook(book.id)}
              style={{
                padding: "5px 10px",
                backgroundColor: "red",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Удалить
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default BooksPage;

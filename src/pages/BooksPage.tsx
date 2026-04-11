import { useEffect, useState } from "react";
import { useAppSelector } from "../app/hooks";
import { BookRepository } from "../repositories/BookRepository";
import BookCard from "../components/BookCard";
import { Book } from "../models/Book";
import "./BooksPage.css";

const bookRepository = new BookRepository();

function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  // Состояния для формы
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [year, setYear] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchBooks = async () => {
    const data = await bookRepository.getAvailableBooks();
    setBooks(data);
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleAddOrEditBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author || !year || !user) return;

    if (editingId) {
      await bookRepository.editBook(
        editingId,
        { title, author, year: parseInt(year) },
        user.id,
        user.roles
      );
      setEditingId(null);
    } else {
      const newBook = new Book(title, author, parseInt(year));
      await bookRepository.addBook(newBook, user.id);
    }

    fetchBooks();
    setTitle("");
    setAuthor("");
    setYear("");
  };

  const handleEditClick = (book: Book) => {
    setEditingId(book.id || null);
    setTitle(book.title);
    setAuthor(book.author);
    setYear(book.year.toString());
  };

  const handleDeleteBook = async (id?: number) => {
    if (id && user) {
      await bookRepository.deleteBook(id, user.id, user.roles);
      fetchBooks();
    }
  };

  const canManageBook = (book: Book) => {
    if (!user) return false;
    const isAdmin = user.roles.includes("admin");
    const isOwner = book.owner_id === user.id;
    return isAdmin || isOwner;
  };

  return (
    <div className="books-page">
      <h1>Каталог доступных книг</h1>

      {isAuthenticated && (
        <form
          onSubmit={handleAddOrEditBook}
          className="add-book-form"
          style={{
            marginBottom: "20px",
            padding: "15px",
            border: "1px solid #ccc",
            borderRadius: "8px",
          }}
        >
          <h3>{editingId ? "Редактировать книгу" : "Добавить новую книгу"}</h3>
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
            <button type="submit">
              {editingId ? "Сохранить" : "Добавить"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setTitle("");
                  setAuthor("");
                  setYear("");
                }}
              >
                Отмена
              </button>
            )}
          </div>
        </form>
      )}

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
            {canManageBook(book) && (
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => handleEditClick(book)}
                  style={{
                    padding: "5px 10px",
                    backgroundColor: "blue",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Редактировать
                </button>
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
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default BooksPage;

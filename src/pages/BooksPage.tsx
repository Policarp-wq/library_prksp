import { useEffect, useState } from "react";
import { useAppSelector } from "../app/hooks";
import { BookRepository } from "../repositories/BookRepository";
import BookCard from "../components/BookCard";
import BookForm from "../components/BookForm";
import { Book } from "../models/Book";
import "./BooksPage.css";

const bookRepository = new BookRepository();

function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const fetchBooks = async (page: number = 1, search: string = "") => {
    setIsLoading(true);
    try {
      const result = await bookRepository.getAvailableBooks(
        search || undefined,
        page
      );
      setBooks(result.books);
      setTotal(result.total);
      setCurrentPage(result.page);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error("Error fetching books:", err);
      setBooks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks(1, "");
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchBooks(1, searchQuery);
  };

  const handleSaveBook = async (book: Book, isEdit: boolean) => {
    if (!user) return;

    try {
      if (isEdit && book.id) {
        await bookRepository.editBook(book.id, {
          title: book.title,
          author: book.author,
          year: book.year,
        });
      } else {
        await bookRepository.addBook(book);
      }
      setEditingBook(null);
      setShowForm(false);
      fetchBooks(currentPage, searchQuery);
    } catch (err) {
      console.error("Error saving book:", err);
      throw err;
    }
  };

  const handleEditClick = (book: Book) => {
    setEditingBook(book);
    setShowForm(true);
  };

  const handleDeleteBook = async (id?: number) => {
    if (
      id &&
      user &&
      window.confirm("Вы уверены, что хотите удалить эту книгу?")
    ) {
      try {
        await bookRepository.deleteBook(id);
        fetchBooks(currentPage, searchQuery);
      } catch (err) {
        console.error("Error deleting book:", err);
      }
    }
  };

  const handleCancel = () => {
    setEditingBook(null);
    setShowForm(false);
  };

  const canManageBook = (book: Book) => {
    if (!user) return false;
    const isAdmin = user.roles.includes("admin");
    const isOwner = book.owner_id === user.id;
    return isAdmin || isOwner;
  };

  const handlePageChange = (page: number) => {
    fetchBooks(page, searchQuery);
  };

  return (
    <div className="books-page">
      <h1>Каталог доступных книг</h1>

      {/* Search Section */}
      <form onSubmit={handleSearch} className="books-search">
        <input
          className="books-search__input"
          type="text"
          placeholder="Поиск по названию..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={isLoading}
        />
        <button
          className="books-search__button"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? "Поиск..." : "Поиск"}
        </button>
      </form>

      {/* Form Section */}
      {isAuthenticated && (
        <>
          {!showForm && (
            <button
              className="books-add-button"
              onClick={() => {
                setEditingBook(null);
                setShowForm(true);
              }}
            >
              + Добавить книгу
            </button>
          )}
          {showForm && (
            <BookForm
              book={editingBook || undefined}
              onSave={handleSaveBook}
              onCancel={handleCancel}
            />
          )}
        </>
      )}

      {/* Books List */}
      {isLoading ? (
        <div className="books-loading">Загрузка...</div>
      ) : books.length === 0 ? (
        <div className="books-empty">Книги не найдены</div>
      ) : (
        <>
          <div className="books-info">
            Найдено: {total} книг
            {total % 10 === 1 && total % 100 !== 11
              ? "а"
              : total % 10 >= 2 &&
                total % 10 <= 4 &&
                (total % 100 < 10 || total % 100 >= 20)
              ? "и"
              : ""}
          </div>
          <ul className="books-list">
            {books.map((book) => (
              <li key={book.id} className="books-list__item">
                <BookCard book={book} />
                {canManageBook(book) && (
                  <div className="books-list__actions">
                    <button
                      className="books-list__action books-list__action--edit"
                      onClick={() => handleEditClick(book)}
                      title="Редактировать"
                    >
                      ✎
                    </button>
                    <button
                      className="books-list__action books-list__action--delete"
                      onClick={() => handleDeleteBook(book.id)}
                      title="Удалить"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="books-pagination">
              <button
                className="books-pagination__button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
              >
                ← Назад
              </button>

              <div className="books-pagination__pages">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      className={`books-pagination__page ${
                        currentPage === page
                          ? "books-pagination__page--active"
                          : ""
                      }`}
                      onClick={() => handlePageChange(page)}
                      disabled={isLoading}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>

              <button
                className="books-pagination__button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || isLoading}
              >
                Вперёд →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default BooksPage;

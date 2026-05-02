import { useEffect, useState } from "react";
import { useAppSelector } from "../app/hooks";
import { BookRepository, type LoanRecord } from "../repositories/BookRepository";
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
  const [actionError, setActionError] = useState("");
  const [activeLoanByBookId, setActiveLoanByBookId] = useState<
    Record<number, LoanRecord>
  >({});
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const isAdmin = Boolean(user?.roles.includes("admin"));

  const fetchBooks = async (page: number = 1, query: string = "") => {
    setIsLoading(true);
    setActionError("");
    try {
      const [result, myActiveLoans] = await Promise.all([
        bookRepository.getAvailableBooks(query || undefined, page),
        isAuthenticated && !isAdmin
          ? bookRepository.getLoans(true)
          : Promise.resolve([]),
      ]);
      const loansMap: Record<number, LoanRecord> = {};
      myActiveLoans.forEach((loan) => {
        loansMap[loan.book_id] = loan;
      });

      setBooks(result.books);
      setTotal(result.total);
      setCurrentPage(result.page);
      setTotalPages(result.totalPages);
      setActiveLoanByBookId(loansMap);
    } catch (err) {
      if (err instanceof Error && err.message) {
        setActionError(err.message);
      } else {
        setActionError("Не удалось загрузить каталог книг");
      }
      setBooks([]);
      setActiveLoanByBookId({});
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks(1, "");
  }, [isAuthenticated, isAdmin]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchBooks(1, searchQuery);
  };

  const handleSaveBook = async (book: Book, isEdit: boolean) => {
    if (!isAdmin) return;

    try {
      if (isEdit && book.id) {
        await bookRepository.editBook(book.id, {
          title: book.title,
          author: book.author,
          year: book.year,
          url: book.url,
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

  const handleDeleteBook = async (book: Book) => {
    if (!isAdmin || !book.id) {
      return;
    }

    if (book.canDelete === false) {
      setActionError(book.deleteReason || "Нельзя удалить: книга сейчас выдана");
      return;
    }

    if (!window.confirm("Вы уверены, что хотите удалить эту книгу?")) {
      return;
    }

    try {
      await bookRepository.deleteBook(book.id);
      setActionError("");
      fetchBooks(currentPage, searchQuery);
    } catch (err) {
      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError("Ошибка при удалении книги");
      }
    }
  };

  const handleBorrowBook = async (bookId?: number) => {
    if (!bookId || !isAuthenticated || isAdmin) {
      return;
    }

    try {
      await bookRepository.borrowBook(bookId);
      setActionError("");
      fetchBooks(currentPage, searchQuery);
    } catch (err) {
      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError("Ошибка при выдаче книги");
      }
    }
  };

  const handleReturnBook = async (bookId?: number) => {
    if (!bookId || !isAuthenticated || isAdmin) {
      return;
    }

    const loan = activeLoanByBookId[bookId];
    if (!loan) {
      return;
    }

    try {
      await bookRepository.returnLoan(loan.id);
      setActionError("");
      fetchBooks(currentPage, searchQuery);
    } catch (err) {
      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError("Ошибка при возврате книги");
      }
    }
  };

  const handleCancel = () => {
    setEditingBook(null);
    setShowForm(false);
  };

  const canManageCatalog = isAuthenticated && isAdmin;

  const handlePageChange = (page: number) => {
    fetchBooks(page, searchQuery);
  };

  return (
    <div className="books-page">
      <h1>Каталог доступных книг</h1>

      <form onSubmit={handleSearch} className="books-search">
        <input
          className="books-search__input"
          type="text"
          placeholder="Поиск по названию и автору..."
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

      {actionError ? <div className="books-error">{actionError}</div> : null}

      {canManageCatalog && (
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
            {books.map((book) => {
              const activeLoan = book.id ? activeLoanByBookId[book.id] : undefined;
              const canBorrow = isAuthenticated && !isAdmin && !activeLoan;
              const canReturn = isAuthenticated && !isAdmin && Boolean(activeLoan);

              return (
                <li key={book.id} className="books-list__item">
                  <BookCard book={book} />
                  {canManageCatalog ? (
                    <>
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
                          onClick={() => handleDeleteBook(book)}
                          title={book.canDelete === false ? book.deleteReason : "Удалить"}
                          disabled={book.canDelete === false}
                        >
                          ✕
                        </button>
                      </div>
                      {book.canDelete === false && book.deleteReason ? (
                        <div className="books-list__delete-hint">{book.deleteReason}</div>
                      ) : null}
                    </>
                  ) : null}

                  {isAuthenticated && !isAdmin ? (
                    <div className="books-list__loan-actions">
                      {canBorrow ? (
                        <button
                          className="books-list__loan-button"
                          onClick={() => handleBorrowBook(book.id)}
                          disabled={isLoading || book.available === false}
                        >
                          Взять
                        </button>
                      ) : null}
                      {canReturn ? (
                        <button
                          className="books-list__loan-button books-list__loan-button--return"
                          onClick={() => handleReturnBook(book.id)}
                          disabled={isLoading}
                        >
                          Вернуть
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>

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

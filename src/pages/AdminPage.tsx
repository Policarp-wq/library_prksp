import { useEffect, useMemo, useState } from "react";
import { useAppSelector } from "../app/hooks";
import { Book } from "../models/Book";
import { BookRepository } from "../repositories/BookRepository";
import "./AdminPage.css";

const bookRepository = new BookRepository();

function AdminPage() {
  const user = useAppSelector((state) => state.auth.user);
  const [books, setBooks] = useState<Book[]>([]);
  const [totalBooks, setTotalBooks] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [queryDraft, setQueryDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const loadBooks = async (page: number, search: string) => {
    setIsLoading(true);
    setActionError("");
    try {
      const response = await bookRepository.getAvailableBooks(
        search || undefined,
        page
      );
      setBooks(response.books);
      setTotalBooks(response.total);
      setCurrentPage(response.page);
      setTotalPages(response.totalPages);
    } catch {
      setActionError("Не удалось загрузить список книг.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBooks(1, "");
  }, []);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchQuery(queryDraft.trim());
    loadBooks(1, queryDraft.trim());
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || isLoading) {
      return;
    }
    loadBooks(page, searchQuery);
  };

  const handleDelete = async (book: Book) => {
    if (!book.id) {
      return;
    }

    const shouldDelete = window.confirm(
      `Удалить книгу "${book.title}" автора ${book.author}?`
    );
    if (!shouldDelete) {
      return;
    }

    setIsLoading(true);
    setActionError("");
    try {
      await bookRepository.deleteBook(book.id);
      const targetPage =
        books.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      await loadBooks(targetPage, searchQuery);
    } catch {
      setActionError("Не удалось удалить книгу.");
      setIsLoading(false);
    }
  };

  const pageAverageYear = useMemo(() => {
    if (!books.length) {
      return 0;
    }
    const sum = books.reduce((acc, item) => acc + item.year, 0);
    return Math.round(sum / books.length);
  }, [books]);

  return (
    <section className="admin-page">
      <h1>Админ-панель</h1>
      <p className="admin-page__subtitle">
        Пользователь: <strong>{user?.name ?? "Неизвестно"}</strong>. Роль:{" "}
        <strong>admin</strong>
      </p>

      <div className="admin-page__grid">
        <article className="admin-page__card">
          <h2>Метрики каталога</h2>
          <p>
            Всего книг: <strong>{totalBooks}</strong>
          </p>
          <p>
            Книг на текущей странице: <strong>{books.length}</strong>
          </p>
          <p>
            Средний год (текущая страница):{" "}
            <strong>{pageAverageYear || "-"}</strong>
          </p>
          <button
            type="button"
            className="admin-page__refresh-button"
            onClick={() => loadBooks(currentPage, searchQuery)}
            disabled={isLoading}
          >
            Обновить метрики
          </button>
        </article>

        <article className="admin-page__card">
          <h2>Модерация каталога</h2>
          <form className="admin-page__search" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              placeholder="Поиск по названию"
              value={queryDraft}
              onChange={(event) => setQueryDraft(event.target.value)}
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading}>
              Поиск
            </button>
          </form>

          {actionError ? (
            <p className="admin-page__error">{actionError}</p>
          ) : null}

          <div className="admin-page__table-wrap">
            <table className="admin-page__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Название</th>
                  <th>Автор</th>
                  <th>Год</th>
                  <th>Действие</th>
                </tr>
              </thead>
              <tbody>
                {books.map((book) => (
                  <tr key={book.id}>
                    <td>{book.id}</td>
                    <td>{book.title}</td>
                    <td>{book.author}</td>
                    <td>{book.year}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-page__delete-button"
                        onClick={() => handleDelete(book)}
                        disabled={isLoading}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
                {!books.length ? (
                  <tr>
                    <td colSpan={5} className="admin-page__empty">
                      Книги не найдены
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="admin-page__pagination">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
            >
              Назад
            </button>
            <span>
              Страница {currentPage} из {totalPages}
            </span>
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
            >
              Вперёд
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}

export default AdminPage;

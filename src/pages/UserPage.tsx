import { useEffect, useState } from "react";
import { useAppSelector } from "../app/hooks";
import {
  BookRepository,
  type LoanRecord,
} from "../repositories/BookRepository";
import "./UserPage.css";

const bookRepository = new BookRepository();

function UserPage() {
  const user = useAppSelector((state) => state.auth.user);
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadActiveLoans = async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await bookRepository.getLoans(true);
      setLoans(result);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Не удалось загрузить ваши книги");
      }
      setLoans([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActiveLoans();
  }, []);

  const handleReturn = async (loanId: number) => {
    try {
      await bookRepository.returnLoan(loanId);
      await loadActiveLoans();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Не удалось вернуть книгу");
      }
    }
  };

  return (
    <section className="user-page">
      <h1>Мои книги</h1>
      <p className="user-page__subtitle">
        Пользователь: <strong>{user?.name ?? "Неизвестно"}</strong>
      </p>

      {error ? <p className="user-page__error">{error}</p> : null}

      {isLoading ? (
        <p>Загрузка...</p>
      ) : loans.length === 0 ? (
        <p>У вас нет активных выдач.</p>
      ) : (
        <ul className="user-page__list">
          {loans.map((loan) => (
            <li key={loan.id} className="user-page__item">
              <div>
                <p className="user-page__title">{loan.book_title ?? "Книга"}</p>
                <p className="user-page__meta">
                  {loan.book_author ?? "Неизвестный автор"}
                  {loan.book_year ? `, ${loan.book_year}` : ""}
                </p>
              </div>
              <button
                type="button"
                className="user-page__button"
                onClick={() => handleReturn(loan.id)}
              >
                Вернуть
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default UserPage;

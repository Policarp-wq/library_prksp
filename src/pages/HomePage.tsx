import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import "./HomePage.css";

const USER_AGREEMENT_KEY = "library-user-agreement-accepted";

function HomePage() {
  const [isChecked, setIsChecked] = useState(false);
  const [isAccepted, setIsAccepted] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(USER_AGREEMENT_KEY) === "true";
  });

  const handleSubmitAgreement = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isChecked) {
      return;
    }

    window.localStorage.setItem(USER_AGREEMENT_KEY, "true");
    setIsAccepted(true);
  };

  return (
    <div className="home-page">
      <h1>Система управления библиотечным фондом</h1>

      {!isAccepted ? (
        <section className="agreement-card">
          <h2>Пользовательское соглашение</h2>
          <p>
            Для продолжения работы подтвердите согласие с правилами
            использования приложения библиотеки.
          </p>

          <form className="agreement-form" onSubmit={handleSubmitAgreement}>
            <label className="agreement-checkbox">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(event) => setIsChecked(event.target.checked)}
              />
              <span>Я принимаю пользовательское соглашение</span>
            </label>

            <button type="submit" disabled={!isChecked}>
              Подтвердить соглашение
            </button>
          </form>
        </section>
      ) : (
        <section className="description">
          <div className="section">
            <h2>Главная страница</h2>
            <p>
              Соглашение принято. Теперь доступен обычный контент приложения и
              переходы по разделам.
            </p>
          </div>
          <div className="section">
            <ul>
              <li>
                Перейти к <Link to="/books">каталогу книг</Link>
              </li>
              <li>
                Открыть <Link to="/dialogs">диалоги поддержки</Link>
              </li>
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

export default HomePage;

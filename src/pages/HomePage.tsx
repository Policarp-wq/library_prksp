import { Link } from "react-router-dom";
import "./HomePage.css";

function HomePage() {
  return (
    <div className="home-page">
      <h1>Система управления библиотечным фондом</h1>

      <section className="description">
        <div className="section">
          <h2>Главная страница</h2>
          <p>
            Приложение для ведения библиотечного фонда: каталог книг,
            резервирование и возврат изданий, разграничение прав пользователей.
          </p>
        </div>
        <div className="section">
          <ul>
            <li>
              Перейти к <Link to="/books">каталогу книг</Link>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}

export default HomePage;

import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import {
  clearAuthError,
  loginWithCredentials,
  registerWithCredentials,
} from "../features/auth/authSlice";
import "./AuthPage.css";

function AuthPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user, error, status } = useAppSelector(
    (state) => state.auth
  );
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    dispatch(clearAuthError());
    setMessage("");

    const username = registerUsername.trim();
    const password = registerPassword.trim();

    if (!username || !password) {
      setMessage("Введите логин и пароль для регистрации.");
      return;
    }

    const action = await dispatch(registerWithCredentials({ username, password }));
    if (registerWithCredentials.fulfilled.match(action)) {
      setRegisterUsername("");
      setRegisterPassword("");
      navigate("/");
    }
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    dispatch(clearAuthError());
    setMessage("");

    const username = loginUsername.trim();
    const password = loginPassword.trim();

    if (!username || !password) {
      setMessage("Введите логин и пароль.");
      return;
    }

    const action = await dispatch(loginWithCredentials({ username, password }));

    if (loginWithCredentials.fulfilled.match(action)) {
      navigate("/");
    }
  };

  return (
    <section className="auth-page">
      <h1>Авторизация пользователя</h1>

      <div className="auth-page__grid">
        <form className="auth-page__form" onSubmit={handleLogin}>
          <h2>Вход</h2>
          <input
            className="auth-page__input"
            type="text"
            placeholder="Логин"
            value={loginUsername}
            onChange={(event) => setLoginUsername(event.target.value)}
            disabled={status === "loading"}
          />
          <input
            className="auth-page__input"
            type="password"
            placeholder="Пароль"
            value={loginPassword}
            onChange={(event) => setLoginPassword(event.target.value)}
            disabled={status === "loading"}
          />
          <button
            className="auth-page__button"
            type="submit"
            disabled={status === "loading"}
          >
            {status === "loading" ? "Вход..." : "Войти"}
          </button>
        </form>

        <form className="auth-page__form" onSubmit={handleRegister}>
          <h2>Регистрация</h2>
          <input
            className="auth-page__input"
            type="text"
            placeholder="Новый логин"
            value={registerUsername}
            onChange={(event) => setRegisterUsername(event.target.value)}
            disabled={status === "loading"}
          />
          <input
            className="auth-page__input"
            type="password"
            placeholder="Новый пароль"
            value={registerPassword}
            onChange={(event) => setRegisterPassword(event.target.value)}
            disabled={status === "loading"}
          />
          <button
            className="auth-page__secondary"
            type="submit"
            disabled={status === "loading"}
          >
            Зарегистрироваться
          </button>
        </form>
      </div>

      {error ? <p className="auth-page__error">{error}</p> : null}
      {message ? <p className="auth-page__warning">{message}</p> : null}

      {isAuthenticated && user ? (
        <div className="auth-page__status">
          <p>Текущий пользователь: {user.name}</p>
          <p>Роли: {user.roles.join(", ") || "нет"}</p>
          <button
            className="auth-page__secondary"
            type="button"
            onClick={() => navigate("/")}
          >
            На главную
          </button>
        </div>
      ) : null}
    </section>
  );
}

export default AuthPage

import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { clearAuthError, setAuthFromMockUser } from '../features/auth/authSlice'
import './AuthPage.css'

const MOCK_USERS_KEY = 'library-mock-users'

interface MockUser {
  username: string
  password: string
}

function readMockUsers() {
  const value = localStorage.getItem(MOCK_USERS_KEY)

  if (!value) {
    return [] as MockUser[]
  }

  try {
    return JSON.parse(value) as MockUser[]
  } catch {
    return [] as MockUser[]
  }
}

function saveMockUsers(users: MockUser[]) {
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users))
}

function AuthPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { isAuthenticated, user, error } = useAppSelector((state) => state.auth)
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [registerUsername, setRegisterUsername] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [message, setMessage] = useState('')

  const handleRegister = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    dispatch(clearAuthError())
    setMessage('')

    const username = registerUsername.trim()
    const password = registerPassword.trim()

    if (!username || !password) {
      setMessage('Введите логин и пароль для регистрации.')
      return
    }

    if (username === 'admin') {
      setMessage('Логин admin зарезервирован под администратора.')
      return
    }

    const users = readMockUsers()
    const exists = users.some((item) => item.username === username)

    if (exists) {
      setMessage('Пользователь с таким логином уже существует.')
      return
    }

    saveMockUsers([...users, { username, password }])
    dispatch(setAuthFromMockUser({ name: username, roles: ['user'] }))
    setRegisterUsername('')
    setRegisterPassword('')
    navigate('/')
  }

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    dispatch(clearAuthError())
    setMessage('')

    const username = loginUsername.trim()
    const password = loginPassword.trim()

    if (!username || !password) {
      setMessage('Введите логин и пароль.')
      return
    }

    if (username === 'admin' && password === 'admin') {
      dispatch(setAuthFromMockUser({ name: 'admin', roles: ['admin'] }))
      navigate('/')
      return
    }

    const users = readMockUsers()
    const foundUser = users.find(
      (item) => item.username === username && item.password === password,
    )

    if (!foundUser) {
      setMessage('Неверный логин или пароль.')
      return
    }

    dispatch(setAuthFromMockUser({ name: foundUser.username, roles: ['user'] }))
    navigate('/')
  }

  return (
    <section className="auth-page">
      <h1>Моковая авторизация</h1>
      <p>Для входа администратором используйте логин `admin` и пароль `admin`.</p>

      <div className="auth-page__grid">
        <form className="auth-page__form" onSubmit={handleLogin}>
          <h2>Вход</h2>
          <input
            className="auth-page__input"
            type="text"
            placeholder="Логин"
            value={loginUsername}
            onChange={(event) => setLoginUsername(event.target.value)}
          />
          <input
            className="auth-page__input"
            type="password"
            placeholder="Пароль"
            value={loginPassword}
            onChange={(event) => setLoginPassword(event.target.value)}
          />
          <button className="auth-page__button" type="submit">
            Войти
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
          />
          <input
            className="auth-page__input"
            type="password"
            placeholder="Новый пароль"
            value={registerPassword}
            onChange={(event) => setRegisterPassword(event.target.value)}
          />
          <button className="auth-page__secondary" type="submit">
            Зарегистрироваться
          </button>
        </form>
      </div>

      {error ? <p className="auth-page__error">{error}</p> : null}
      {message ? <p className="auth-page__warning">{message}</p> : null}

      {isAuthenticated && user ? (
        <div className="auth-page__status">
          <p>Текущий пользователь: {user.name}</p>
          <p>Роли: {user.roles.join(', ') || 'нет'}</p>
          <button className="auth-page__secondary" type="button" onClick={() => navigate('/')}>
            На главную
          </button>
        </div>
      ) : null}
    </section>
  )
}

export default AuthPage

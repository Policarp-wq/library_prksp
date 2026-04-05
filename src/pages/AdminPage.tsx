import { useAppSelector } from '../app/hooks'
import './AdminPage.css'

function AdminPage() {
  const user = useAppSelector((state) => state.auth.user)

  return (
    <section className="admin-page">
      <h1>Админ-зона</h1>
      <p className="admin-page__subtitle">Панель управления библиотечным приложением.</p>

      <div className="admin-page__grid">
        <article className="admin-page__card">
          <h2>Доступ</h2>
          <p>Роль подтверждена: <strong>admin</strong></p>
          <p>Пользователь: {user?.name ?? 'Неизвестно'}</p>
        </article>

        <article className="admin-page__card">
          <h2>Быстрые действия</h2>
          <ul>
            <li>Проверка состояния диалогов</li>
            <li>Контроль доступа пользователей</li>
            <li>Мониторинг учебных данных</li>
          </ul>
        </article>
      </div>
    </section>
  )
}

export default AdminPage

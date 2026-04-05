import { useAppSelector } from '../app/hooks'

function UserPage() {
  const user = useAppSelector((state) => state.auth.user)

  return (
    <section>
      <h1>User зона</h1>
      <p>Доступ разрешен для роли `user`.</p>
      <p>Текущий пользователь: {user?.name ?? 'Неизвестно'}</p>
    </section>
  )
}

export default UserPage

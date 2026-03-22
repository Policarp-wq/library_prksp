import { NavLink, Outlet } from 'react-router-dom'
import './MainLayout.css'

function MainLayout() {
  return (
    <div className="app">
      <header className="header">
        <nav className="navigation">
          <NavLink to="/" className="nav-link">
            Home
          </NavLink>
          <NavLink to="/dialogs" className="nav-link">
            Dialogs
          </NavLink>
          <NavLink to="/books" className="nav-link">
            Books
          </NavLink>
        </nav>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <footer className="footer">
        <p>Система управления библиотекой</p>
      </footer>
    </div>
  )
}

export default MainLayout

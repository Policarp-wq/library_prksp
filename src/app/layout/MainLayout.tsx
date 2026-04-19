import { NavLink, Outlet } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from "../hooks";
import { logout } from "../../features/auth/authSlice";
import './MainLayout.css'

function MainLayout() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const isAdmin = isAuthenticated && Boolean(user?.roles.includes("admin"));

  return (
    <div className="app">
      <header className="header">
        <nav className="navigation">
          <NavLink to="/" className="nav-link">
            Home
          </NavLink>
          <NavLink to="/books" className="nav-link">
            Books
          </NavLink>
          {isAdmin ? (
            <NavLink to="/admin" className="nav-link">
              Admin
            </NavLink>
          ) : null}
          <NavLink to="/auth" className="nav-link">
            Auth
          </NavLink>

          {isAuthenticated ? (
            <button
              className="nav-link nav-link--button"
              type="button"
              onClick={() => dispatch(logout())}
            >
              Logout ({user?.name})
            </button>
          ) : null}
        </nav>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <footer className="footer">
        <p>Система управления библиотекой</p>
      </footer>
    </div>
  );
}

export default MainLayout

import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import HomePage from './pages/HomePage'
import BooksPage from './pages/BooksPage'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app">
        <header className="header">
          <nav className="navigation">
            <Link to="/" className="nav-link">Главная</Link>
            <Link to="/books" className="nav-link">Каталог книг</Link>
          </nav>
        </header>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/books" element={<BooksPage />} />
          </Routes>
        </main>

        <footer className="footer">
          <p>Система управления библиотекой</p>
        </footer>
      </div>
    </Router>
  )
}

export default App

import { BookRepository } from '../repositories/BookRepository'
import BookCard from '../components/BookCard'
import './BooksPage.css'

const bookRepository = new BookRepository()

function BooksPage() {
  const books = bookRepository.getAvailableBooks()

  return (
    <div className="books-page">
      <h1>Каталог доступных книг</h1>
      <ul className="books-list">
        {books.map((book, index) => (
          <li key={index} className="books-list__item">
            <BookCard book={book} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export default BooksPage

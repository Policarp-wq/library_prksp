import { Book } from '../models/Book'
import { DEFAULT_BOOK_IMAGE } from '../constants/constants'
import './BookCard.css'

interface BookCardProps {
  book: Book
}

function BookCard({ book }: BookCardProps) {
  return (
    <div className="book-card">
      <div className="book-card__image">
        <img 
          src={book.image || DEFAULT_BOOK_IMAGE} 
          alt={book.title}
        />
      </div>
      <div className="book-card__info">
        <h3 className="book-card__title">{book.title}</h3>
        <p className="book-card__author">{book.author}</p>
        <p className="book-card__year">Год издания: {book.year}</p>
      </div>
    </div>
  )
}

export default BookCard

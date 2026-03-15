import { Book } from '../models/Book'

export class BookRepository {
  private books: Book[]

  constructor() {
    this.books = [
      new Book(
        'Мастер и Маргарита',
        'Михаил Булгаков',
        1967
      ),
      new Book(
        'Война и мир',
        'Лев Толстой',
        1869,
      ),
      new Book(
        'Преступление и наказание',
        'Фёдор Достоевский',
        1866
      ),
      new Book(
        'Евгений Онегин',
        'Александр Пушкин',
        1833,
      ),
      new Book(
        'Анна Каренина',
        'Лев Толстой',
        1877
      ),
      new Book(
        'Идиот',
        'Фёдор Достоевский',
        1869,
      ),
    ]
  }

  getAvailableBooks(): Book[] {
    return this.books
  }
}

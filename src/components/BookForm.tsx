import React, { useState, useEffect } from 'react';
import { Book } from '../models/Book';
import './BookForm.css';

interface BookFormProps {
  book?: Book;
  onSave: (book: Book, isEdit: boolean) => Promise<void>;
  onCancel: () => void;
}

function BookForm({ book, onSave, onCancel }: BookFormProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [year, setYear] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (book) {
      setTitle(book.title);
      setAuthor(book.author);
      setYear(book.year.toString());
      setUrl(book.url || '');
    } else {
      setTitle('');
      setAuthor('');
      setYear('');
      setUrl('');
    }
  }, [book]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!title || !author || !year) {
      setError('Все поля обязательны');
      return;
    }

    const normalizedUrl = url.trim();
    if (normalizedUrl) {
      try {
        const parsed = new URL(normalizedUrl);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          setError("URL должен начинаться с http:// или https://");
          return;
        }
      } catch {
        setError("Некорректный URL");
        return;
      }
    }

    const isEdit = !!book;
    const newBook = new Book(
      title,
      author,
      parseInt(year),
      undefined,
      book?.id,
      book?.owner_id,
      undefined,
      undefined,
      undefined,
      normalizedUrl || undefined
    );

    try {
      setIsLoading(true);
      await onSave(newBook, isEdit);
      setSuccessMessage(isEdit ? 'Книга успешно обновлена' : 'Книга успешно добавлена');
      
      if (!isEdit) {
        setTitle('');
        setAuthor('');
        setYear('');
        setUrl('');
      }
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Ошибка при сохранении книги');
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="book-form">
      <h3 className="book-form__title">
        {book ? 'Редактировать книгу' : 'Добавить новую книгу'}
      </h3>

      {error && (
        <div className="book-form__error">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="book-form__success">
          {successMessage}
        </div>
      )}

      <div className="book-form__group">
        <input
          className="book-form__input"
          type="text"
          placeholder="Название"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>

      <div className="book-form__group">
        <input
          className="book-form__input"
          type="text"
          placeholder="Автор"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>

      <div className="book-form__group">
        <input
          className="book-form__input"
          type="number"
          placeholder="Год издания"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>

      <div className="book-form__group">
        <input
          className="book-form__input"
          type="url"
          placeholder="Ссылка на книгу (https://...)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="book-form__actions">
        <button
          className="book-form__button book-form__button--submit"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? 'Сохранение...' : (book ? 'Сохранить' : 'Добавить')}
        </button>
        <button
          className="book-form__button book-form__button--cancel"
          type="button"
          onClick={onCancel}
          disabled={isLoading}
        >
          Отмена
        </button>
      </div>
    </form>
  );
}

export default BookForm;

import type { Dialog, DialogMessage } from '../types/dialogs'

export const dialogs: Dialog[] = [
  { id: 1, name: 'Техподдержка библиотеки' },
  { id: 2, name: 'Отдел продления книг' },
]

export const messages: DialogMessage[] = [
  {
    id: 1,
    dialogId: 1,
    author: 'Оператор',
    message: '22fefew',
  },
  {
    id: 2,
    dialogId: 1,
    author: 'Пользователь',
    message: 'Проверка отображения сообщений в приложении библиотеки.',
  },
  {
    id: 3,
    dialogId: 2,
    author: 'Оператор',
    message: 'Test',
  },
  {
    id: 4,
    dialogId: 2,
    author: 'Пользователь',
    message: 'OMG',
  },
]

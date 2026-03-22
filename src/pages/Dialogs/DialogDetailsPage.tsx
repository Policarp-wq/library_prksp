import { useState } from 'react'
import type { FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import MessageItem from '../../components/dialogs/MessageItem'
import type { Dialog, DialogMessage } from '../../types/dialogs'
import './DialogDetailsPage.css'

interface DialogDetailsPageProps {
  dialogs: Dialog[]
  messages: DialogMessage[]
  onSendMessage: (dialogId: number, messageText: string) => void
}

function DialogDetailsPage({ dialogs, messages, onSendMessage }: DialogDetailsPageProps) {
  const { id } = useParams<{ id: string }>()
  const [messageText, setMessageText] = useState('')
  const dialogId = Number(id)

  if (!id || Number.isNaN(dialogId)) {
    return <h1 className="dialog-details__title">Диалог не найден</h1>
  }

  const dialog = dialogs.find((item) => item.id === dialogId)

  if (!dialog) {
    return <h1 className="dialog-details__title">Диалог не найден</h1>
  }

  const selectedMessages = messages.filter((item) => item.dialogId === dialogId)

  const handleSubmitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSendMessage(dialogId, messageText)
    setMessageText('')
  }

  return (
    <section className="dialog-details">
      <h1 className="dialog-details__title">Диалог {dialog.id}</h1>
      <h2 className="dialog-details__subtitle">Участник: {dialog.name}</h2>

      <ul className="messages-list">
        {selectedMessages.map((item) => (
          <MessageItem key={item.id} message={item.message} author={item.author} />
        ))}
      </ul>

      <form className="dialog-details__form" onSubmit={handleSubmitMessage}>
        <textarea
          className="dialog-details__textarea"
          placeholder="Введите сообщение"
          value={messageText}
          onChange={(event) => setMessageText(event.target.value)}
          rows={3}
        />
        <button className="dialog-details__button" type="submit">
          Отправить
        </button>
      </form>
    </section>
  )
}

export default DialogDetailsPage

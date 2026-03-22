import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import MainLayout from './layout/MainLayout'
import HomePage from '../pages/HomePage'
import BooksPage from '../pages/BooksPage'
import DialogsPage from '../pages/Dialogs/DialogsPage'
import DialogDetailsPage from '../pages/Dialogs/DialogDetailsPage'
import { dialogs as initialDialogs, messages as initialMessages } from '../data/dialogs'
import type { Dialog, DialogMessage } from '../types/dialogs'

const DIALOGS_STORAGE_KEY = 'library-dialogs'
const MESSAGES_STORAGE_KEY = 'library-messages'

function App() {
  const [dialogs, setDialogs] = useState<Dialog[]>(() => {
    const storedDialogs = localStorage.getItem(DIALOGS_STORAGE_KEY)

    if (!storedDialogs) {
      return initialDialogs
    }

    try {
      return JSON.parse(storedDialogs) as Dialog[]
    } catch {
      return initialDialogs
    }
  })

  const [messages, setMessages] = useState<DialogMessage[]>(() => {
    const storedMessages = localStorage.getItem(MESSAGES_STORAGE_KEY)

    if (!storedMessages) {
      return initialMessages
    }

    try {
      return JSON.parse(storedMessages) as DialogMessage[]
    } catch {
      return initialMessages
    }
  })

  useEffect(() => {
    localStorage.setItem(DIALOGS_STORAGE_KEY, JSON.stringify(dialogs))
  }, [dialogs])

  useEffect(() => {
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages))
  }, [messages])

  const handleCreateDialog = (name: string, firstMessage: string): number | null => {
    const trimmedName = name.trim()
    const trimmedMessage = firstMessage.trim()

    if (!trimmedName || !trimmedMessage) {
      return null
    }

    const nextDialogId = dialogs.reduce((max, dialog) => Math.max(max, dialog.id), 0) + 1
    const nextMessageId = messages.reduce((max, message) => Math.max(max, message.id), 0) + 1

    setDialogs((prevDialogs) => [
      ...prevDialogs,
      { id: nextDialogId, name: trimmedName },
    ])

    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: nextMessageId,
        dialogId: nextDialogId,
        author: 'Пользователь',
        message: trimmedMessage,
      },
    ])

    return nextDialogId
  }

  const handleSendMessage = (dialogId: number, messageText: string) => {
    const trimmedMessage = messageText.trim()

    if (!trimmedMessage) {
      return
    }

    const nextMessageId = messages.reduce((max, message) => Math.max(max, message.id), 0) + 1

    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: nextMessageId,
        dialogId,
        author: 'Пользователь',
        message: trimmedMessage,
      },
    ])
  }

  const handleClearDialogs = () => {
    setDialogs([])
    setMessages([])
    localStorage.removeItem(DIALOGS_STORAGE_KEY)
    localStorage.removeItem(MESSAGES_STORAGE_KEY)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/dialogs"
            element={
              <DialogsPage
                dialogs={dialogs}
                messages={messages}
                onCreateDialog={handleCreateDialog}
                onClearDialogs={handleClearDialogs}
              />
            }
          />
          <Route
            path="/dialogs/:id"
            element={
              <DialogDetailsPage
                dialogs={dialogs}
                messages={messages}
                onSendMessage={handleSendMessage}
              />
            }
          />
          <Route path="/books" element={<BooksPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App

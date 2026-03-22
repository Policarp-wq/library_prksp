import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { dialogs as initialDialogs, messages as initialMessages } from '../../data/dialogs'
import type { Dialog, DialogMessage } from '../../types/dialogs'

const DIALOGS_STORAGE_KEY = 'library-dialogs'
const MESSAGES_STORAGE_KEY = 'library-messages'

export interface DialogsState {
  dialogs: Dialog[]
  messages: DialogMessage[]
}

interface CreateDialogPayload {
  name: string
  firstMessage: string
}

interface SendMessagePayload {
  dialogId: number
  messageText: string
}

function readFromStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') {
    return null
  }

  const value = window.localStorage.getItem(key)

  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export function loadDialogsState(): DialogsState {
  return {
    dialogs: readFromStorage<Dialog[]>(DIALOGS_STORAGE_KEY) ?? initialDialogs,
    messages: readFromStorage<DialogMessage[]>(MESSAGES_STORAGE_KEY) ?? initialMessages,
  }
}

export function saveDialogsState(state: DialogsState) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(DIALOGS_STORAGE_KEY, JSON.stringify(state.dialogs))
  window.localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(state.messages))
}

const dialogsSlice = createSlice({
  name: 'dialogs',
  initialState: loadDialogsState(),
  reducers: {
    createDialog: (state, action: PayloadAction<CreateDialogPayload>) => {
      const trimmedName = action.payload.name.trim()
      const trimmedMessage = action.payload.firstMessage.trim()

      if (!trimmedName || !trimmedMessage) {
        return
      }

      const nextDialogId = state.dialogs.reduce((max, dialog) => Math.max(max, dialog.id), 0) + 1
      const nextMessageId = state.messages.reduce((max, message) => Math.max(max, message.id), 0) + 1

      state.dialogs.push({
        id: nextDialogId,
        name: trimmedName,
      })

      state.messages.push({
        id: nextMessageId,
        dialogId: nextDialogId,
        author: 'Пользователь',
        message: trimmedMessage,
      })
    },
    sendMessage: (state, action: PayloadAction<SendMessagePayload>) => {
      const trimmedMessage = action.payload.messageText.trim()

      if (!trimmedMessage) {
        return
      }

      const dialogExists = state.dialogs.some((dialog) => dialog.id === action.payload.dialogId)

      if (!dialogExists) {
        return
      }

      const nextMessageId = state.messages.reduce((max, message) => Math.max(max, message.id), 0) + 1

      state.messages.push({
        id: nextMessageId,
        dialogId: action.payload.dialogId,
        author: 'Пользователь',
        message: trimmedMessage,
      })
    },
    clearDialogs: (state) => {
      state.dialogs = []
      state.messages = []
    },
  },
})

export const { createDialog, sendMessage, clearDialogs } = dialogsSlice.actions
export default dialogsSlice.reducer

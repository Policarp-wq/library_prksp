export interface Dialog {
  id: number
  name: string
}

export interface DialogMessage {
  id: number
  dialogId: number
  message: string
  author?: string
}

export interface DialogItemProps {
  id: string | number
  name: string
}

export interface MessageItemProps {
  message: string
  author?: string
}

import type { MessageItemProps } from '../../types/dialogs'

function MessageItem({ message, author }: MessageItemProps) {
  return (
    <li className="message-item">
      {author ? <strong className="message-item__author">{author}: </strong> : null}
      <span>{message}</span>
    </li>
  )
}

export default MessageItem

import { Link } from 'react-router-dom'
import type { DialogItemProps } from '../../types/dialogs'

function DialogItem(props: DialogItemProps) {
  const path = `/dialogs/${props.id}`

  return (
    <li className="dialog-item">
      <Link to={path} className="dialog-item__link">
        {props.name}
      </Link>
    </li>
  )
}

export default DialogItem

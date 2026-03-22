import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import DialogItem from '../../components/dialogs/DialogItem'
import MessageItem from '../../components/dialogs/MessageItem'
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  clearDialogs,
  createDialog,
} from "../../features/dialogs/dialogsSlice";
import './DialogsPage.css'

function DialogsPage() {
  const dispatch = useAppDispatch();
  const { dialogs, messages } = useAppSelector((state) => state.dialogs);
  const [dialogName, setDialogName] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [previewDialogId, setPreviewDialogId] = useState<number | null>(
    dialogs[0]?.id ?? null
  );

  useEffect(() => {
    if (
      !previewDialogId ||
      !dialogs.some((dialog) => dialog.id === previewDialogId)
    ) {
      setPreviewDialogId(dialogs[0]?.id ?? null);
    }
  }, [dialogs, previewDialogId]);

  const previewDialog = dialogs.find((dialog) => dialog.id === previewDialogId);
  const visibleMessages = previewDialog
    ? messages.filter((item) => item.dialogId === previewDialog.id)
    : [];

  const handleCreateDialog = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = dialogName.trim();
    const trimmedMessage = firstMessage.trim();

    if (!trimmedName || !trimmedMessage) {
      return;
    }

    const nextDialogId =
      dialogs.reduce((max, dialog) => Math.max(max, dialog.id), 0) + 1;
    dispatch(createDialog({ name: trimmedName, firstMessage: trimmedMessage }));

    setPreviewDialogId(nextDialogId);
    setDialogName("");
    setFirstMessage("");
  };

  const handleClearDialogs = () => {
    dispatch(clearDialogs());
    setPreviewDialogId(null);
  };

  return (
    <section className="dialogs-page">
      <h1>Диалоги</h1>
      <div className="dialogs-page__columns">
        <aside className="dialogs-page__sidebar">
          <h2>Список диалогов</h2>
          <ul className="dialogs-list">
            {dialogs.map((dialog) => (
              <DialogItem key={dialog.id} id={dialog.id} name={dialog.name} />
            ))}
          </ul>

          <button
            className="dialogs-page__clear-button"
            type="button"
            onClick={handleClearDialogs}
          >
            Очистить диалоги
          </button>

          <form className="dialogs-page__form" onSubmit={handleCreateDialog}>
            <h3>Создать новый диалог</h3>
            <input
              className="dialogs-page__input"
              type="text"
              placeholder="Кому пишем (например, Техподдержка)"
              value={dialogName}
              onChange={(event) => setDialogName(event.target.value)}
            />
            <textarea
              className="dialogs-page__textarea"
              placeholder="Первое сообщение"
              value={firstMessage}
              onChange={(event) => setFirstMessage(event.target.value)}
              rows={3}
            />
            <button className="dialogs-page__button" type="submit">
              Создать и отправить
            </button>
          </form>
        </aside>

        <div className="dialogs-page__messages">
          <h2>
            Сообщения
            {previewDialog ? `: ${previewDialog.name}` : ""}
          </h2>
          <ul className="messages-list">
            {visibleMessages.map((item) => (
              <MessageItem
                key={item.id}
                message={item.message}
                author={item.author}
              />
            ))}
          </ul>
          {!visibleMessages.length ? (
            <p className="dialogs-page__hint">
              Сообщений пока нет. Создайте новый диалог.
            </p>
          ) : null}
          <p className="dialogs-page__hint">
            Для открытия конкретного диалога нажмите на имя слева.
          </p>
        </div>
      </div>
    </section>
  );
}

export default DialogsPage

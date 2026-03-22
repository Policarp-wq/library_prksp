import { configureStore } from '@reduxjs/toolkit'
import dialogsReducer, { saveDialogsState } from '../features/dialogs/dialogsSlice'

export const store = configureStore({
  reducer: {
    dialogs: dialogsReducer,
  },
})

store.subscribe(() => {
  saveDialogsState(store.getState().dialogs)
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

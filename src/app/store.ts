import { configureStore } from '@reduxjs/toolkit'
import dialogsReducer, { saveDialogsState } from '../features/dialogs/dialogsSlice'
import authReducer, { saveAuthState } from "../features/auth/authSlice";

export const store = configureStore({
  reducer: {
    dialogs: dialogsReducer,
    auth: authReducer,
  },
});

store.subscribe(() => {
  saveDialogsState(store.getState().dialogs)
  saveAuthState(store.getState().auth);
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

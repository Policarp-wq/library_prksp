import { configureStore } from "@reduxjs/toolkit";
import authReducer, { saveAuthState } from "../features/auth/authSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

store.subscribe(() => {
  saveAuthState(store.getState().auth);
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

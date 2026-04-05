import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./layout/MainLayout";
import HomePage from "../pages/HomePage";
import BooksPage from "../pages/BooksPage";
import DialogsPage from "../pages/Dialogs/DialogsPage";
import DialogDetailsPage from "../pages/Dialogs/DialogDetailsPage";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import AuthPage from "../pages/AuthPage";
import AuthCallbackPage from "../pages/AuthCallbackPage";
import UserPage from "../pages/UserPage";
import AdminPage from "../pages/AdminPage";
import ForbiddenPage from "../pages/ForbiddenPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/forbidden" element={<ForbiddenPage />} />
          <Route path="/dialogs" element={<DialogsPage />} />
          <Route path="/dialogs/:id" element={<DialogDetailsPage />} />
          <Route path="/books" element={<BooksPage />} />

          <Route element={<ProtectedRoute roles={["user"]} />}>
            <Route path="/user" element={<UserPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={["admin"]} />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

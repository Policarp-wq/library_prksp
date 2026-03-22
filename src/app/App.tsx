import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./layout/MainLayout";
import HomePage from "../pages/HomePage";
import BooksPage from "../pages/BooksPage";
import DialogsPage from "../pages/Dialogs/DialogsPage";
import DialogDetailsPage from "../pages/Dialogs/DialogDetailsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/dialogs" element={<DialogsPage />} />
          <Route path="/dialogs/:id" element={<DialogDetailsPage />} />
          <Route path="/books" element={<BooksPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

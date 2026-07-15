import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { assertClientEnv } from './lib/config';
import { CompleteProfilePage } from './pages/CompleteProfilePage';
import { HomePage } from './pages/HomePage';
import { InvitePage } from './pages/InvitePage';

assertClientEnv();

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route path="/complete-profile" element={<CompleteProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

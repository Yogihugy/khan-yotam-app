import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { assertClientEnv } from './lib/config';
import { AuthenticatedApp } from './pages/AuthenticatedApp';
import { CompleteProfilePage } from './pages/CompleteProfilePage';
import { InvitePage } from './pages/InvitePage';
import { OnboardingPage } from './pages/OnboardingPage';

assertClientEnv();

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/complete-profile" element={<CompleteProfilePage />} />
        <Route path="/*" element={<AuthenticatedApp />} />
      </Routes>
    </BrowserRouter>
  );
}

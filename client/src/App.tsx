import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { TopicsPage } from './pages/TopicsPage';
import { TopicPage } from './pages/TopicPage';
import { SubmitPerspectivePage } from './pages/SubmitPerspectivePage';
import { ComparePage } from './pages/ComparePage';
import { AskQuestionPage } from './pages/AskQuestionPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { QuestionReviewQueuePage } from './pages/QuestionReviewQueuePage';
import { MyQuestionsPage } from './pages/MyQuestionsPage';
import { ModerationQueuePage } from './pages/ModerationQueuePage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { SearchPage } from './pages/SearchPage';
import { NotFoundPage } from './pages/NotFoundPage';

function ScrollToHash() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      document.querySelector(hash)?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
}

const REVIEWER_ROLES = ['moderator', 'admin'] as const;

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToHash />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/topics" element={<TopicsPage />} />
          <Route
            path="/topics/:slug/perspectives/new"
            element={
              <ProtectedRoute>
                <SubmitPerspectivePage />
              </ProtectedRoute>
            }
          />
          <Route path="/topics/:slug" element={<TopicPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route
            path="/questions/new"
            element={
              <ProtectedRoute>
                <AskQuestionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/questions/mine"
            element={
              <ProtectedRoute>
                <MyQuestionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={[...REVIEWER_ROLES]}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/questions"
            element={
              <ProtectedRoute allowedRoles={[...REVIEWER_ROLES]} forbiddenRedirectTo="/">
                <QuestionReviewQueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute allowedRoles={[...REVIEWER_ROLES]}>
                <ModerationQueuePage />
              </ProtectedRoute>
            }
          />
          <Route path="/search" element={<SearchPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

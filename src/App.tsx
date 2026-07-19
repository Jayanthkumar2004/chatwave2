import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { QueryProvider } from '@/providers/query-provider';
import { Toaster } from '@/components/ui/toaster';
import { ProtectedRoute, PublicOnlyRoute } from '@/routes/protected-route';
import { AuthLayout } from '@/pages/auth/auth-layout';
import { LoginPage } from '@/pages/auth/login';
import { RegisterPage } from '@/pages/auth/register';
import { ForgotPasswordPage } from '@/pages/auth/forgot-password';
import { FullPageLoader } from '@/components/shared/loaders';

const ResetPasswordPage = lazy(() => import('@/pages/auth/reset-password').then(m => ({ default: m.ResetPasswordPage })));
const ChatPage = lazy(() => import('@/pages/chat/chat-page').then(m => ({ default: m.ChatPage })));
const ProfileSettingsPage = lazy(() => import('@/pages/profile/profile-settings').then(m => ({ default: m.ProfileSettingsPage })));

function AppRoutes() {
  const { loading } = useAuth();
  if (loading) return <FullPageLoader />;

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/chats" replace />} />

      {/* Public (auth) routes — redirect to /chats if already signed in */}
      <Route element={<PublicOnlyRoute><AuthLayout /></PublicOnlyRoute>}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route path="/reset-password" element={<Suspense fallback={<FullPageLoader />}><ResetPasswordPage /></Suspense>} />

      {/* Protected app routes */}
      <Route
        path="/chats"
        element={
          <ProtectedRoute>
            <Suspense fallback={<FullPageLoader />}><ChatPage /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/chats/:chatId"
        element={
          <ProtectedRoute>
            <Suspense fallback={<FullPageLoader />}><ChatPage /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Suspense fallback={<FullPageLoader />}><ProfileSettingsPage /></Suspense>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/chats" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
            <Toaster />
          </BrowserRouter>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}

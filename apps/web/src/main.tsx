import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './app/auth-context';
import { AppLayout } from './app/app-layout';
import { ProtectedRoute } from './app/protected-route';
import { ActivityPage } from './pages/activity-page';
import { AdminOrgsPage } from './pages/admin-orgs-page';
import { AdminUsersPage } from './pages/admin-users-page';
import { LoginPage } from './pages/login-page';
import { RolesPage } from './pages/roles-page';
import { SettingsPage } from './pages/settings-page';
import { SummaryPage } from './pages/summary-page';
import { SurveyPage } from './pages/survey-page';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route
              path="/survey"
              element={
                <ProtectedRoute
                  permission="responses:submit"
                  module="responses"
                >
                  <SurveyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/summary"
              element={
                <ProtectedRoute permission="summary:read" module="summary">
                  <SummaryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/roles"
              element={
                <ProtectedRoute permission="roles:create">
                  <RolesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute permission="orgs:update">
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/people"
              element={
                <ProtectedRoute permission="users:create">
                  <AdminUsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orgs"
              element={
                <ProtectedRoute permission="orgs:create">
                  <AdminOrgsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/activity"
              element={
                <ProtectedRoute permission="activity:read" module="activity">
                  <ActivityPage />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);

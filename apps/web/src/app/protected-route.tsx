import { Navigate } from 'react-router-dom';
import { useAuth } from './auth-context';

export function ProtectedRoute({
  permission,
  children,
}: {
  permission?: string;
  children: React.ReactNode;
}) {
  const { token, has } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (permission && !has(permission)) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

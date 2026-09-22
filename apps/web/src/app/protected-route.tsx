import { Navigate } from 'react-router-dom';
import { useAuth } from './auth-context';
import { homePath } from './home-path';

export function ProtectedRoute({
  permission,
  module,
  children,
}: {
  permission?: string;
  module?: string;
  children: React.ReactNode;
}) {
  const { token, has, hasModule } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (permission && !has(permission)) {
    return <Navigate to={homePath(has, hasModule)} replace />;
  }
  if (module && !hasModule(module)) {
    return <Navigate to={homePath(has, hasModule)} replace />;
  }
  return <>{children}</>;
}

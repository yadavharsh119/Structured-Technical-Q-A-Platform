import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { UserRole } from '@structured-qa/shared';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        className="mx-auto max-w-content px-6 py-16 text-center text-sm text-muted"
        data-testid="auth-loading"
      >
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="mx-auto max-w-content px-6 py-16 text-center" data-testid="auth-forbidden">
        <h1 className="font-serif text-[28px] text-ink">You do not have permission to view this page.</h1>
      </div>
    );
  }

  return <>{children}</>;
}

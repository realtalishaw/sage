import React from 'react';
import { Navigate } from 'react-router-dom';
import { checkUserHasAccess } from '../services/access';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * ProtectedRoute component that checks if user has access (active subscription or valid free hours)
 * If user doesn't have access, redirects to /checkout
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, fallback }) => {
  const [hasAccess, setHasAccess] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkAccess = async () => {
      try {
        const access = await checkUserHasAccess();
        setHasAccess(access);
      } catch (error) {
        console.error('Error checking user access:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, []);

  if (loading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  if (!hasAccess) {
    return <Navigate to="/checkout" replace />;
  }

  return <>{children}</>;
};

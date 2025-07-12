import { useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import { AuthContext, UserProfile } from '@/contexts/AuthContext';

const publicRoutes = ['/', '/login', '/signup', '/forgot-password', '/reset-password'];

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: Array<UserProfile['role']>;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
  const { user, userProfile, initializing } = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;

    const isPublicRoute = publicRoutes.includes(router.pathname);

    if (!user && !isPublicRoute) {
      router.push('/login');
      return;
    }

    if (user && roles && roles.length > 0 && userProfile) {
      if (!roles.includes(userProfile.role)) {
        router.push('/unauthorized'); // Or some other appropriate page
      }
    }
  }, [user, userProfile, initializing, router, roles]);

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user && !publicRoutes.includes(router.pathname)) {
    return null;
  }
  
  if (roles && roles.length > 0 && (!userProfile || !roles.includes(userProfile.role))) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
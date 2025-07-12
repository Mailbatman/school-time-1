import { useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import { AuthContext, Role } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: Array<Role>;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
  const { user, userProfile, initializing } = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {
    if (initializing) {
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }

    if (user && roles && roles.length > 0 && userProfile) {
      if (!roles.includes(userProfile.role)) {
        router.push('/unauthorized');
      }
    }
  }, [user, userProfile, initializing, router, roles]);

  if (initializing || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }
  
  if (roles && roles.length > 0 && (!userProfile || !roles.includes(userProfile.role))) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';

const roleDashboardMap: { [key: string]: string } = {
  SUPER_ADMIN: '/super-admin-dashboard',
  SCHOOL_ADMIN: '/school-admin-dashboard',
  TEACHER: '/teacher-dashboard',
  PARENT_STUDENT: '/parent-student-dashboard',
  ADMIN: '/super-admin-dashboard',
  USER: '/parent-student-dashboard',
};

const RoleBasedRedirect = ({ children }: { children: React.ReactNode }) => {
  const { userProfile, initializing } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (initializing || !userProfile) {
      return;
    }

    const intendedPath = roleDashboardMap[userProfile.role];

    if (router.pathname === '/dashboard' && intendedPath) {
      router.replace(intendedPath);
    }
  }, [userProfile, initializing, router]);

  return &lt;>{children}&lt;/>;
};

export default RoleBasedRedirect;
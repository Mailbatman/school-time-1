import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

const TeacherDashboard = () => {
  const { userProfile } = useAuth();

  return (
    <ProtectedRoute roles={['TEACHER']}>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Teacher Dashboard</h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
            Welcome, {userProfile?.firstName} {userProfile?.lastName}!
          </p>
          <p className="mt-1 text-md text-gray-500 dark:text-gray-400">
            Your role is: {userProfile?.role}
          </p>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default TeacherDashboard;
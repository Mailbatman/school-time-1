import ProtectedRoute from '@/components/ProtectedRoute';

const DashboardPage = () => {
  return (
    <ProtectedRoute>
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    </ProtectedRoute>
  );
};

export default DashboardPage;
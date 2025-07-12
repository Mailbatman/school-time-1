import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';

const ParentStudentDashboard = () => {
  const { userProfile } = useAuth();

  return (
    <ProtectedRoute roles={['PARENT_STUDENT', 'USER']}>
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-grow flex flex-col items-center justify-center text-center px-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-primary">Parent/Student Dashboard</h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Welcome, {userProfile?.firstName} {userProfile?.lastName}!
            </p>
            <p className="mt-1 text-md text-muted-foreground">
              Your role is: <strong>{userProfile?.role}</strong>
            </p>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default ParentStudentDashboard;
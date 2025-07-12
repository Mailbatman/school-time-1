import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';

const TeacherDashboard = () => {
  const { userProfile } = useAuth();

  return (
    <ProtectedRoute roles={['TEACHER']}>
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-grow flex flex-col items-center justify-center text-center px-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-primary">Teacher Dashboard</h1>
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

export default TeacherDashboard;
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/router';

const SchoolAdminDashboard = () => {
  const { userProfile } = useAuth();
  const router = useRouter();

  return (
    <ProtectedRoute roles={['SCHOOL_ADMIN']}>
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-grow flex flex-col items-center justify-center text-center px-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-primary">School Admin Dashboard</h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Welcome, {userProfile?.firstName} {userProfile?.lastName}!
            </p>
            <p className="mt-1 text-md text-muted-foreground">
              Your role is: <strong>{userProfile?.role}</strong>
            </p>
            <Button
              size="lg"
              onClick={() => router.push('/school-admin/manage')}
              className="mt-8"
            >
              Manage School
            </Button>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default SchoolAdminDashboard;
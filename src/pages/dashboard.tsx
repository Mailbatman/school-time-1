import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import ProtectedRoute from '@/components/ProtectedRoute';

const DashboardPage = () => {
  const { user, signOut } = useContext(AuthContext);

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-grow flex flex-col items-center justify-center text-center px-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-primary">
              Welcome to your Dashboard
            </h1>
            {user && (
              <p className="mt-4 text-lg md:text-xl text-muted-foreground">
                You are logged in as {user.email}
              </p>
            )}
            <Button
              size="lg"
              onClick={signOut}
              className="mt-8"
            >
              Log Out
            </Button>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default DashboardPage;
import { useContext } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';
import { Button } from "@/components/ui/button";

const Header = () => {
  const { user, initializing, signOut } = useContext(AuthContext);
  const router = useRouter();

  return (
    <header className="w-full">
      <div className="flex justify-between items-center py-4 px-4 sm:px-6 lg:px-8">
        <div className="cursor-pointer" onClick={() => router.push("/")}>
          <Logo />
        </div>
        {!initializing && (
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Button 
                  onClick={() => router.push('/dashboard')}
                  variant="ghost"
                >
                  Dashboard
                </Button>
                <Button 
                  onClick={signOut}
                  variant="default"
                >
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={() => router.push('/login')}
                  variant="ghost"
                >
                  Sign In
                </Button>
                <Button 
                  onClick={() => router.push('/signup')}
                  variant="default"
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
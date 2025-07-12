import type { AppProps } from 'next/app'
import { AuthProvider } from '@/contexts/AuthContext'
import '../styles/globals.css';
import ProtectedRoute from '@/components/ProtectedRoute';
import RoleBasedRedirect from '@/components/RoleBasedRedirect';
import { Toaster } from "@/components/ui/toaster"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const publicPages = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/enroll', '/unauthorized', '/error'];

export default function App({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    const colorScheme = computedStyle.getPropertyValue('--mode').trim().replace(/"/g, '');
    if (colorScheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.add('light');
    }
    setMounted(true);
  }, []);

  // Prevent flash while theme loads
  if (!mounted) {
    return null;
  }

  const isPublicPage = publicPages.includes(router.pathname);

  return (
    <div className="min-h-screen">
      <AuthProvider>
        {isPublicPage ? (
          <Component {...pageProps} />
        ) : (
          <ProtectedRoute>
            <RoleBasedRedirect>
              <Component {...pageProps} />
            </RoleBasedRedirect>
          </ProtectedRoute>
        )}
        <Toaster />
      </AuthProvider>
    </div>
  )
}
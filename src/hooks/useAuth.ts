'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface AuthState {
  isAuthenticated: boolean | null; // null = loading, true = authenticated, false = unauthenticated
  username: string | null; // Current username from params
}

export const useAuth = (): AuthState => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const params = useParams();
  const username = Array.isArray(params.user) ? params.user[0] : params.user || null;

  useEffect(() => {
    const checkAuth = () => {
      const user = localStorage.getItem('username');
      console.log('Checking auth, user in localStorage:', user, 'params.user:', username);

      if (!user || user !== username) {
        console.log('Authentication failed, redirecting to /login');
        setIsAuthenticated(false);
        router.push('/login');
      } else {
        console.log('User authenticated');
        setIsAuthenticated(true);
      }
    };

    const timer = setTimeout(checkAuth, 100); // Delay to ensure params are ready
    return () => clearTimeout(timer);
  }, [router, username]);

  return { isAuthenticated, username };
};
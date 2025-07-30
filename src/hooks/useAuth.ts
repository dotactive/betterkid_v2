'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AuthState {
  isAuthenticated: boolean | null; // null = loading, true = authenticated, false = unauthenticated
  username: string | null; // Current username from localStorage
}

export const useAuth = (): AuthState => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const user = localStorage.getItem('username');
      console.log('Checking auth, user in localStorage:', user);

      if (!user) {
        console.log('Authentication failed, redirecting to /login');
        setIsAuthenticated(false);
        setUsername(null);
        router.push('/login');
      } else {
        console.log('User authenticated');
        setIsAuthenticated(true);
        setUsername(user);
      }
    };

    const timer = setTimeout(checkAuth, 100); // Delay to ensure localStorage is ready
    return () => clearTimeout(timer);
  }, [router]);

  return { isAuthenticated, username };
};
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AuthState {
  isAuthenticated: boolean | null; // null = loading, true = authenticated, false = unauthenticated
  userId: string | null; // Current userId from localStorage
}

export const useAuth = (): AuthState => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const user = localStorage.getItem('userId');
      console.log('Checking auth, userId in localStorage:', user);

      if (!user) {
        console.log('Authentication failed, redirecting to /');
        setIsAuthenticated(false);
        setUserId(null);
        router.push('/');
      } else {
        console.log('User authenticated');
        setIsAuthenticated(true);
        setUserId(user);
      }
    };

    const timer = setTimeout(checkAuth, 50); // Reduced delay to ensure localStorage is ready
    return () => clearTimeout(timer);
  }, [router]);

  return { isAuthenticated, userId };
};
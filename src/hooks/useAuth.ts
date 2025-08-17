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

    // Initial check with minimal delay
    const timer = setTimeout(checkAuth, 10);

    // Listen for localStorage changes (for cross-tab/component sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userId') {
        console.log('localStorage change detected for userId:', e.newValue);
        checkAuth();
      }
    };

    // Listen for custom storage events (for same-tab updates)
    const handleCustomStorageChange = () => {
      console.log('Custom storage change detected');
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-changed', handleCustomStorageChange);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-changed', handleCustomStorageChange);
    };
  }, [router]);

  return { isAuthenticated, userId };
};
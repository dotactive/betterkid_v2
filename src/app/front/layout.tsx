
'use client';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, userId } = useAuth();
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated && userId) {
      console.log('Fetching balance for user:', userId);
      const fetchBalance = async () => {
        try {
          const response = await axios.get(`/api/user-balance?userId=${encodeURIComponent(userId)}`);
          console.log(`Fetched balance for ${userId}:`, response.data);
          setBalance(response.data.balance || 0);
        } catch (err: any) {
          console.error('Failed to fetch balance:', err);
          setError(err.response?.data?.error || 'Failed to fetch balance');
        }
      };
      
      const fetchUserInfo = async () => {
        try {
          const response = await axios.get('/api/users');
          const users = response.data;
          const currentUser = users.find((user: any) => user.userId === userId);
          if (currentUser) {
            setUsername(currentUser.username);
          }
        } catch (err: any) {
          console.error('Failed to fetch user info:', err);
        }
      };
      
      fetchBalance();
      fetchUserInfo();
    }
  }, [isAuthenticated, userId]);
  
  const handleLogout = () => {
    console.log('Logging out user:', userId);
    localStorage.removeItem('userId');
    router.push('/');
  };

  if (isAuthenticated === null) {
    return <div>Loading authentication...</div>;
  }

  if (!isAuthenticated) {
    return null; // Redirect handled by useAuth
  }
 
  return (
    <>
      <header className="bg-blue-500 text-white px-6 py-4 flex flex-col md:flex-row justify-between items-center">
        <div className="text-center md:text-left">
          <h1 className="text-2xl font-bold">To be a better kid!</h1>
          <h2 className="text-xl mt-1">Welcome, <span className="text-yellow-300 font-semibold">{username || userId}</span>!</h2>
        </div>
        <div className="flex items-center mt-4 md:mt-0 gap-4">
          <div className="flex items-center gap-2">

            <span className="text-lg">Your Super Coins: <span className="font-bold">$ {balance?.toFixed(2)}</span></span>
          </div>
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg">Grown-Up Zone</button>
          <button onClick={handleLogout} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg">Blast Off (Log Out)</button>
        </div>
      </header>

      <nav className="bg-blue-100 text-blue-900 py-3 px-6 flex justify-center gap-6 font-medium">
        <Link  href="/front/behaviors" className="hover:underline">Behaviors</Link>
        <Link href="/front/earnlose" className="hover:underline">Earn Super Coins</Link>
        <Link href="/front/spend" className="hover:underline">Spend Super Coins</Link>
        <Link href="/front/logs" className="hover:underline">Logs</Link>
      </nav>
      <main className="px-6 py-8">
        {children}
      </main>
    </>
  );
}
